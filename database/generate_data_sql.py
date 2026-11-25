import json
import re

def escape_sql(text):
    if text is None:
        return 'NULL'
    # Escape backslashes and single quotes
    t = text.replace('\\', '\\\\').replace("'", "''")
    return f"'{t}'"

def generate_sql():
    with open('data/questions.json', 'r', encoding='utf-8') as f:
        questions = json.load(f)

    sql_statements = [
        "-- TỰ ĐỘNG SINH DỮ LIỆU TỪ DATA/QUESTIONS.JSON",
        "USE `triet_hoc_quiz`;",
        "SET NAMES utf8mb4;",
        "SET FOREIGN_KEY_CHECKS = 0;",
        "TRUNCATE TABLE `quiz_attempt_details`;",
        "TRUNCATE TABLE `quiz_attempts`;",
        "TRUNCATE TABLE `options`;",
        "TRUNCATE TABLE `questions`;",
        "TRUNCATE TABLE `topics`;",
        "SET FOREIGN_KEY_CHECKS = 1;",
        "",
        "-- Thêm các chủ đề",
        "INSERT INTO `topics` (`id`, `code`, `title`, `description`) VALUES",
        "(1, 'ONTAP1', 'Bộ đề ôn tập 1 (100 câu)', 'Tổng hợp 100 câu hỏi trọng tâm từ file ONTAP1.pdf môn Triết học Mác - Lênin'),",
        "(2, 'ONTAP2', 'Bộ đề ôn tập 2 (50 câu)', 'Tổng hợp 50 câu hỏi nâng cao & thực tiễn từ file ONTAP2.pdf môn Triết học Mác - Lênin');",
        ""
    ]

    q_inserts = []
    opt_inserts = []

    q_id_counter = 1
    opt_id_counter = 1

    for q in questions:
        topic_id = q['part_id']
        q_num = q['num']
        content = escape_sql(q['question'])
        q_inserts.append(f"({q_id_counter}, {topic_id}, {q_num}, {content}, NULL)")

        correct_ans = q.get('correct_answer')
        for opt in q['options']:
            label = escape_sql(opt['label'])
            opt_content = escape_sql(opt['text'])
            is_correct = 1 if opt['label'].upper() == correct_ans else 0
            opt_inserts.append(f"({opt_id_counter}, {q_id_counter}, {label}, {opt_content}, {is_correct})")
            opt_id_counter += 1

        q_id_counter += 1

    # Batch insert questions
    sql_statements.append("-- Thêm các câu hỏi")
    sql_statements.append("INSERT INTO `questions` (`id`, `topic_id`, `q_num`, `content`, `explanation`) VALUES\n" + ",\n".join(q_inserts) + ";\n")

    # Batch insert options (chunk into batches of 100 to avoid huge single statements)
    sql_statements.append("-- Thêm các phương án lựa chọn")
    batch_size = 100
    for i in range(0, len(opt_inserts), batch_size):
        chunk = opt_inserts[i:i + batch_size]
        sql_statements.append("INSERT INTO `options` (`id`, `question_id`, `label`, `content`, `is_correct`) VALUES\n" + ",\n".join(chunk) + ";")

    sql_content = "\n".join(sql_statements)
    with open('database/data.sql', 'w', encoding='utf-8') as f:
        f.write(sql_content)

    print(f"Generated database/data.sql successfully: {len(questions)} questions, {len(opt_inserts)} options.")

if __name__ == '__main__':
    generate_sql()

