import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// All Likert questions across the 7 newly added assessments
const questionList = [
  // Attachment Style (asm_attachment)
  { id: 'q_att_1', asm: 'asm_attachment', dim: 'dim_att_secure' },
  { id: 'q_att_2', asm: 'asm_attachment', dim: 'dim_att_secure' },
  { id: 'q_att_3', asm: 'asm_attachment', dim: 'dim_att_anxious' },
  { id: 'q_att_4', asm: 'asm_attachment', dim: 'dim_att_anxious' },
  { id: 'q_att_5', asm: 'asm_attachment', dim: 'dim_att_avoidant' },
  { id: 'q_att_6', asm: 'asm_attachment', dim: 'dim_att_avoidant' },
  { id: 'q_att_7', asm: 'asm_attachment', dim: 'dim_att_fearful' },
  { id: 'q_att_8', asm: 'asm_attachment', dim: 'dim_att_fearful' },

  // Love Language (asm_love_language)
  { id: 'q_ll_1', asm: 'asm_love_language', dim: 'dim_ll_words' },
  { id: 'q_ll_2', asm: 'asm_love_language', dim: 'dim_ll_time' },
  { id: 'q_ll_3', asm: 'asm_love_language', dim: 'dim_ll_gifts' },
  { id: 'q_ll_4', asm: 'asm_love_language', dim: 'dim_ll_acts' },
  { id: 'q_ll_5', asm: 'asm_love_language', dim: 'dim_ll_touch' },

  // Emotional Intelligence (asm_eq)
  { id: 'q_eq_1', asm: 'asm_eq', dim: 'dim_eq_aware' },
  { id: 'q_eq_2', asm: 'asm_eq', dim: 'dim_eq_reg' },
  { id: 'q_eq_3', asm: 'asm_eq', dim: 'dim_eq_mot' },
  { id: 'q_eq_4', asm: 'asm_eq', dim: 'dim_eq_emp' },
  { id: 'q_eq_5', asm: 'asm_eq', dim: 'dim_eq_soc' },

  // Introvert vs Extrovert (asm_intro_extro)
  { id: 'q_ie_1', asm: 'asm_intro_extro', dim: 'dim_ie_intro' },
  { id: 'q_ie_2', asm: 'asm_intro_extro', dim: 'dim_ie_intro' },
  { id: 'q_ie_3', asm: 'asm_intro_extro', dim: 'dim_ie_extro' },
  { id: 'q_ie_4', asm: 'asm_intro_extro', dim: 'dim_ie_extro' },

  // Self Esteem (asm_self_esteem)
  { id: 'q_se_1', asm: 'asm_self_esteem', dim: 'dim_se_worth' },
  { id: 'q_se_2', asm: 'asm_self_esteem', dim: 'dim_se_worth' },
  { id: 'q_se_3', asm: 'asm_self_esteem', dim: 'dim_se_eff' },
  { id: 'q_se_4', asm: 'asm_self_esteem', dim: 'dim_se_worth', reverse: true },

  // Communication Style (asm_communication)
  { id: 'q_cs_1', asm: 'asm_communication', dim: 'dim_cs_assert' },
  { id: 'q_cs_2', asm: 'asm_communication', dim: 'dim_cs_pass' },
  { id: 'q_cs_3', asm: 'asm_communication', dim: 'dim_cs_aggr' },
  { id: 'q_cs_4', asm: 'asm_communication', dim: 'dim_cs_pass_aggr' },

  // Conflict Style (asm_conflict)
  { id: 'q_cf_1', asm: 'asm_conflict', dim: 'dim_cf_collab' },
  { id: 'q_cf_2', asm: 'asm_conflict', dim: 'dim_cf_comp' },
  { id: 'q_cf_3', asm: 'asm_conflict', dim: 'dim_cf_accom' },
  { id: 'q_cf_4', asm: 'asm_conflict', dim: 'dim_cf_compete' },
  { id: 'q_cf_5', asm: 'asm_conflict', dim: 'dim_cf_avoid' }
];

const likertOptions = [
  { val: 1, text: 'Strongly Disagree' },
  { val: 2, text: 'Disagree' },
  { val: 3, text: 'Neutral' },
  { val: 4, text: 'Agree' },
  { val: 5, text: 'Strongly Agree' }
];

let sql = '-- 5-Point Likert Options & Scoring Rules Seed Migration\n\n';

// 1. Generate Options
for (const q of questionList) {
  for (const opt of likertOptions) {
    const optId = `opt_${q.id}_${opt.val}`;
    sql += `INSERT OR REPLACE INTO question_options (id, question_id, option_text, option_value, display_order, status) VALUES ('${optId}', '${q.id}', '${opt.text}', '${opt.val}', ${opt.val}, 'active');\n`;
  }
}

sql += '\n-- Scoring Rules\n';

// 2. Generate Scoring Rules
for (const q of questionList) {
  for (const opt of likertOptions) {
    const optId = `opt_${q.id}_${opt.val}`;
    const ruleId = `sr_${q.id}_${opt.val}`;
    const score = q.reverse ? (6 - opt.val) : opt.val;
    sql += `INSERT OR REPLACE INTO scoring_rules (id, assessment_id, question_id, dimension_id, option_id, score, weight, reverse_scoring) VALUES ('${ruleId}', '${q.asm}', '${q.id}', '${q.dim}', '${optId}', ${score}.0, 1.0, ${q.reverse ? 1 : 0});\n`;
  }
}

const outPath = path.join(__dirname, '..', 'seeds', 'full_likert_options.sql');
fs.writeFileSync(outPath, sql, 'utf8');
console.log(`Generated ${outPath} with full 5-point Likert options and scoring rules for ${questionList.length} questions.`);
