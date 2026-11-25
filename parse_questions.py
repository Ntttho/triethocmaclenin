import re
import json

def parse_markdown_quiz(md_path):
    with open(md_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    current_part = "PHẦN 1: ONTAP1 (100 câu)"
    part_id = 1
    questions = []
    current_q = None

    q_pattern = re.compile(r'^\*{0,2}Câu\s*(\d+)[\.:\*\s]+(.*)', re.IGNORECASE)
    opt_pattern = re.compile(r'^-\s*\*{0,2}([A-E])[\.:]\s*\*{0,2}(.*)', re.IGNORECASE)
    ans_pattern = re.compile(r'^>\s*\*{0,2}Đáp án đúng:\s*([A-E])', re.IGNORECASE)

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        if "PHẦN 2:" in stripped:
            current_part = "PHẦN 2: ONTAP2 (50 câu)"
            part_id = 2
            continue

        q_match = q_pattern.match(stripped)
        if q_match:
            if current_q:
                questions.append(current_q)
            q_num = int(q_match.group(1))
            q_content = q_match.group(2).strip().rstrip('*').strip()
            current_q = {
                "num": q_num,
                "part_id": part_id,
                "part_name": current_part,
                "question": q_content,
                "options": [],
                "correct_answer": None
            }
            continue

        ans_match = ans_pattern.match(stripped)
        if ans_match and current_q:
            current_q["correct_answer"] = ans_match.group(1).upper()
            continue

        opt_match = opt_pattern.match(stripped)
        if opt_match and current_q:
            opt_letter = opt_match.group(1).upper()
            opt_text = opt_match.group(2).strip().rstrip('*').strip()
            # check if option was bolded (**D. text**)
            is_bold = stripped.startswith('- **') or stripped.endswith('**')
            current_q["options"].append({
                "label": opt_letter,
                "text": opt_text
            })
            if is_bold and not current_q["correct_answer"]:
                current_q["correct_answer"] = opt_letter
            continue

        # If it's continuation of question title
        if current_q and not current_q["options"] and not stripped.startswith('#') and not stripped.startswith('>'):
            current_q["question"] += " " + stripped
        elif current_q and current_q["options"] and not stripped.startswith('>') and not stripped.startswith('#'):
            current_q["options"][-1]["text"] += " " + stripped

    if current_q:
        questions.append(current_q)

    return questions

if __name__ == '__main__':
    md_file = 't_ng_h_p_n_t_p_tri_t_h_c_m_c_l_nin.md'
    quiz_data = parse_markdown_quiz(md_file)
    print(f"Total parsed questions: {len(quiz_data)}")
    
    part1_count = sum(1 for q in quiz_data if q['part_id'] == 1)
    part2_count = sum(1 for q in quiz_data if q['part_id'] == 2)
    print(f"Part 1 count: {part1_count}")
    print(f"Part 2 count: {part2_count}")

    # Validation
    missing_ans = [q for q in quiz_data if not q.get('correct_answer')]
    print(f"Questions missing correct answer: {len(missing_ans)}")
    if missing_ans:
        for m in missing_ans[:3]:
            print("Missing:", m)

    # Save to data/questions.json
    import os
    os.makedirs('data', exist_ok=True)
    with open('data/questions.json', 'w', encoding='utf-8') as out_f:
        json.dump(quiz_data, out_f, ensure_ascii=False, indent=2)
    print("Saved to data/questions.json successfully.")

