-- Phase 5A.5 · 题库同步 RPC（基线；逐字取自线上 pg_get_functiondef('public.sync_exam_paper')）
-- SECURITY: 默认 INVOKER、search_path=public。写入路径经 service_role 执行（4E 后 authenticated 无题库写权限）。
create or replace function public.sync_exam_paper(p_source_id text, p_source_file text, p_content_hash text, p_year integer, p_title text, p_source_json jsonb)
 returns jsonb
 language plpgsql
 set search_path to 'public'
as $function$
declare
    v_existing_paper_id uuid;
    v_existing_hash text;
    v_paper_id uuid;
    v_version integer;

    v_section jsonb;
    v_question jsonb;
    v_blank jsonb;
    v_para jsonb;

    v_section_id uuid;
    v_item_id uuid;
    v_option_index integer;

    v_section_no integer := 0;
    v_item_no integer;
    v_type text;
    v_source_id text;

    v_sections_count integer := 0;
    v_items_count integer := 0;
    v_options_count integer := 0;

    v_is_same boolean := false;
begin

    ----------------------------------------------------------------
    -- 1. 基础参数检查
    ----------------------------------------------------------------

    if p_source_id is null or trim(p_source_id) = '' then
        raise exception 'p_source_id cannot be empty';
    end if;

    if p_source_file is null or trim(p_source_file) = '' then
        raise exception 'p_source_file cannot be empty';
    end if;

    if p_content_hash is null or trim(p_content_hash) = '' then
        raise exception 'p_content_hash cannot be empty';
    end if;

    if p_source_json is null then
        raise exception 'p_source_json cannot be null';
    end if;

    if jsonb_typeof(p_source_json) <> 'array' then
        raise exception 'p_source_json must be a JSON array';
    end if;


    ----------------------------------------------------------------
    -- 2. 检查当前版本是否已经是同一个 hash
    ----------------------------------------------------------------

    select
        id,
        content_hash
    into
        v_existing_paper_id,
        v_existing_hash
    from public.exam_papers
    where source_id = p_source_id
      and is_current = true
    limit 1;

    if v_existing_paper_id is not null
       and v_existing_hash = p_content_hash then

        return jsonb_build_object(
            'success', true,
            'status', 'unchanged',
            'source_id', p_source_id,
            'paper_id', v_existing_paper_id,
            'version', (
                select version
                from public.exam_papers
                where id = v_existing_paper_id
            ),
            'sections_count', 0,
            'items_count', 0,
            'options_count', 0
        );
    end if;


    ----------------------------------------------------------------
    -- 3. 获取新版本号
    ----------------------------------------------------------------

    select coalesce(max(version), 0) + 1
    into v_version
    from public.exam_papers
    where source_id = p_source_id;


    ----------------------------------------------------------------
    -- 4. 当前版本取消
    ----------------------------------------------------------------

    update public.exam_papers
    set
        is_current = false,
        updated_at = now()
    where source_id = p_source_id
      and is_current = true;


    ----------------------------------------------------------------
    -- 5. 创建新的 exam_papers
    ----------------------------------------------------------------

    insert into public.exam_papers (
        source_id,
        year,
        title,
        version,
        is_current,
        source_file,
        content_hash,
        metadata
    )
    values (
        p_source_id,
        p_year,
        p_title,
        v_version,
        true,
        p_source_file,
        p_content_hash,
        jsonb_build_object(
            'import_source', 'github',
            'imported_at', now()
        )
    )
    returning id into v_paper_id;


    ----------------------------------------------------------------
    -- 6. 解析所有 section
    ----------------------------------------------------------------

    for v_section in
        select value
        from jsonb_array_elements(p_source_json)
    loop

        v_section_no := v_section_no + 1;

        v_type := v_section->>'type';
        v_source_id := v_section->>'id';


        ----------------------------------------------------------------
        -- 7. 创建 exam_sections
        ----------------------------------------------------------------

        insert into public.exam_sections (
            paper_id,
            source_id,
            type,
            title,
            score,
            minutes,
            intro,
            passage,
            passage_zh,
            prompt,
            tips,
            extra_data,
            source_data,
            sort_order
        )
        values (
            v_paper_id,
            v_source_id,
            v_type,
            v_section->>'title',

            case
                when v_section ? 'score'
                    then (v_section->>'score')::numeric
                else null
            end,

            case
                when v_section ? 'minutes'
                    then (v_section->>'minutes')::integer
                else null
            end,

            v_section->>'intro',
            v_section->>'passage',
            v_section->>'passage_zh',
            v_section->>'prompt',
            v_section->>'tips',

            (
                v_section
                - 'id'
                - 'type'
                - 'title'
                - 'score'
                - 'minutes'
                - 'intro'
                - 'passage'
                - 'passage_zh'
                - 'prompt'
                - 'tips'
                - 'questions'
                - 'blanks'
                - 'paras'
            ),

            v_section,
            v_section_no
        )
        returning id into v_section_id;

        v_sections_count := v_sections_count + 1;


        ----------------------------------------------------------------
        -- 8. 阅读理解 questions
        ----------------------------------------------------------------

        if v_type = '阅读理解'
           and jsonb_typeof(v_section->'questions') = 'array'
        then

            v_item_no := 0;

            for v_question in
                select value
                from jsonb_array_elements(v_section->'questions')
            loop

                v_item_no := v_item_no + 1;

                insert into public.section_items (
                    section_id,
                    source_id,
                    item_no,
                    item_type,
                    content,
                    explanation,
                    correct_option,
                    extra_data
                )
                values (
                    v_section_id,
                    coalesce(
                        v_question->>'id',
                        v_source_id || '-q-' || v_item_no
                    ),
                    v_item_no,
                    'choice',
                    v_question->>'q',
                    v_question->>'explain',

                    case
                        when v_question ? 'ans'
                            then (v_question->>'ans')::integer
                        else null
                    end,

                    '{}'::jsonb
                )
                returning id into v_item_id;

                v_items_count := v_items_count + 1;


                -- options
                if jsonb_typeof(v_question->'opts') = 'array' then

                    v_option_index := 0;

                    for v_option_index in
                        0 .. jsonb_array_length(v_question->'opts') - 1
                    loop

                        insert into public.item_options (
                            item_id,
                            option_index,
                            content
                        )
                        values (
                            v_item_id,
                            v_option_index,
                            v_question->'opts'->>v_option_index
                        );

                        v_options_count := v_options_count + 1;

                    end loop;

                end if;

            end loop;

        end if;


        ----------------------------------------------------------------
        -- 9. 完形填空 blanks
        ----------------------------------------------------------------

        if v_type = '完形填空'
           and jsonb_typeof(v_section->'blanks') = 'array'
        then

            v_item_no := 0;

            for v_blank in
                select value
                from jsonb_array_elements(v_section->'blanks')
            loop

                v_item_no := v_item_no + 1;

                insert into public.section_items (
                    section_id,
                    source_id,
                    item_no,
                    item_type,
                    content,
                    explanation,
                    correct_option,
                    extra_data
                )
                values (
                    v_section_id,
                    v_source_id || '-blank-' || v_item_no,
                    v_item_no,
                    'choice',
                    '第 ' || v_item_no || ' 空',

                    v_blank->>'explain',

                    case
                        when v_blank ? 'ans'
                            then (v_blank->>'ans')::integer
                        else null
                    end,

                    jsonb_build_object(
                        'blank_no', v_item_no
                    )
                )
                returning id into v_item_id;

                v_items_count := v_items_count + 1;


                -- options
                if jsonb_typeof(v_blank->'opts') = 'array' then

                    v_option_index := 0;

                    for v_option_index in
                        0 .. jsonb_array_length(v_blank->'opts') - 1
                    loop

                        insert into public.item_options (
                            item_id,
                            option_index,
                            content
                        )
                        values (
                            v_item_id,
                            v_option_index,
                            v_blank->'opts'->>v_option_index
                        );

                        v_options_count := v_options_count + 1;

                    end loop;

                end if;

            end loop;

        end if;


        ----------------------------------------------------------------
        -- 10. 新题型 paras
        ----------------------------------------------------------------

        if v_type = '新题型'
           and jsonb_typeof(v_section->'paras') = 'array'
        then

            v_item_no := 0;

            for v_para in
                select value
                from jsonb_array_elements(v_section->'paras')
            loop

                v_item_no := v_item_no + 1;

                insert into public.section_items (
                    section_id,
                    source_id,
                    item_no,
                    item_type,
                    content,
                    explanation,
                    correct_option,
                    extra_data
                )
                values (
                    v_section_id,
                    v_source_id || '-para-' || v_item_no,
                    v_item_no,
                    'choice',
                    v_para->>'text',
                    v_para->>'explain',

                    case
                        when v_para ? 'ans'
                            then (v_para->>'ans')::integer
                        else null
                    end,

                    jsonb_build_object(
                        'titles', coalesce(
                            v_section->'titles',
                            '[]'::jsonb
                        )
                    )
                )
                returning id into v_item_id;

                v_items_count := v_items_count + 1;


                -- 新题型的 titles 也是选项
                if jsonb_typeof(v_section->'titles') = 'array' then

                    v_option_index := 0;

                    for v_option_index in
                        0 .. jsonb_array_length(v_section->'titles') - 1
                    loop

                        insert into public.item_options (
                            item_id,
                            option_index,
                            content
                        )
                        values (
                            v_item_id,
                            v_option_index,
                            v_section->'titles'->>v_option_index
                        );

                        v_options_count := v_options_count + 1;

                    end loop;

                end if;

            end loop;

        end if;


        ----------------------------------------------------------------
        -- 11. 翻译
        ----------------------------------------------------------------

        if v_type = '翻译' then

            insert into public.section_items (
                section_id,
                source_id,
                item_no,
                item_type,
                content,
                explanation,
                correct_option,
                extra_data
            )
            values (
                v_section_id,
                v_source_id || '-item-1',
                1,
                'text',
                v_section->>'passage',
                null,
                null,
                jsonb_build_object(
                    'intro', v_section->>'intro',
                    'reference_translation', v_section->>'passage_zh'
                )
            );

            v_items_count := v_items_count + 1;

        end if;


        ----------------------------------------------------------------
        -- 12. 小作文 / 大作文
        ----------------------------------------------------------------

        if v_type = '写作' then

            insert into public.section_items (
                section_id,
                source_id,
                item_no,
                item_type,
                content,
                explanation,
                correct_option,
                extra_data
            )
            values (
                v_section_id,
                v_source_id || '-item-1',
                1,
                'text',
                v_section->>'prompt',
                null,
                null,
                jsonb_build_object(
                    'tips', v_section->>'tips',
                    'chart', coalesce(v_section->'chart', 'false'::jsonb)
                )
            );

            v_items_count := v_items_count + 1;

        end if;

    end loop;


    ----------------------------------------------------------------
    -- 13. 返回同步结果
    ----------------------------------------------------------------

    return jsonb_build_object(
        'success', true,
        'status', 'imported',
        'source_id', p_source_id,
        'paper_id', v_paper_id,
        'version', v_version,
        'sections_count', v_sections_count,
        'items_count', v_items_count,
        'options_count', v_options_count
    );

end;
$function$;
