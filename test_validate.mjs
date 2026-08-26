// Validation check using exact rules from AssessmentImportExportService
const validCategories = ['personality', 'emotional-intelligence', 'relationships', 'career-work', 'mental-wellbeing', 'mindset-growth', 'leadership', 'communication'];

function validateJson(data) {
  const errors = [];
  const warnings = [];

  if (!data || typeof data !== 'object') {
    errors.push('Must be an object');
    return { errors, warnings };
  }

  if (data.schema_version !== '1.0') {
    errors.push('schema_version must be "1.0"');
  }

  const asm = data.assessment;
  if (!asm) errors.push('Missing assessment');
  else {
    if (!asm.name) errors.push('Missing assessment.name');
    if (!asm.slug || !/^[a-z0-9-]+$/.test(asm.slug)) errors.push('Invalid assessment.slug');
    if (!asm.short_description) errors.push('Missing assessment.short_description');
    if (!asm.category_slug) errors.push('Missing assessment.category_slug');
    if (!validCategories.includes(asm.category_slug)) errors.push('Invalid category_slug: ' + asm.category_slug);
  }

  const dimKeys = new Set();
  const dimensions = data.dimensions || [];
  if (dimensions.length !== 5) errors.push('Expected exactly 5 dimensions, found ' + dimensions.length);

  for (let i = 0; i < dimensions.length; i++) {
    const d = dimensions[i];
    if (!d.key) errors.push(`dim[${i}] missing key`);
    else {
      if (dimKeys.has(d.key)) errors.push(`duplicate dim key ${d.key}`);
      dimKeys.add(d.key);
    }
    if (!d.name) errors.push(`dim[${i}] missing name`);
  }

  const questions = data.questions || [];
  if (questions.length !== 25) errors.push('Expected exactly 25 questions, found ' + questions.length);

  const dimQCount = {};
  const qIds = new Set();

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.id) errors.push(`q[${i}] missing id`);
    else {
      if (qIds.has(q.id)) errors.push(`duplicate q id ${q.id}`);
      qIds.add(q.id);
    }
    if (!q.text) errors.push(`q[${i}] missing text`);
    if (!q.dimension_key || !dimKeys.has(q.dimension_key)) {
      errors.push(`q[${i}] invalid dimension_key ${q.dimension_key}`);
    } else {
      dimQCount[q.dimension_key] = (dimQCount[q.dimension_key] || 0) + 1;
    }
    if (!Array.isArray(q.options) || q.options.length !== 5) {
      errors.push(`q[${i}] must have 5 options`);
    } else {
      const optValues = new Set();
      for (const opt of q.options) {
        if (!opt.text) errors.push(`q[${i}] opt missing text`);
        if (!opt.value) errors.push(`q[${i}] opt missing value`);
        if (optValues.has(opt.value)) errors.push(`q[${i}] duplicate opt value ${opt.value}`);
        optValues.add(opt.value);
      }
    }
  }

  for (const [key, count] of Object.entries(dimQCount)) {
    if (count !== 5) errors.push(`Dimension ${key} has ${count} questions (expected 5)`);
  }

  return { errors, warnings, dimQCount };
}

const payload = {
  "schema_version": "1.0",
  "assessment": {
    "name": "Love Language Quiz",
    "slug": "love-language-quiz",
    "short_description": "Discover how you express and experience relational appreciation across five foundational interaction styles.",
    "long_description": "The Love Language Quiz is a grounded self-reflection instrument designed to help you understand your emotional connection preferences across words of appreciation, quality time, helpful actions, thoughtful gifts, and physical affection.",
    "instructions": "Read each statement carefully and select the degree to which you agree or disagree based on how you genuinely experience connection in your relationships.",
    "category_slug": "relationships",
    "access_type": "free",
    "estimated_minutes": 6,
    "status": "published",
    "featured": 1,
    "disclaimer": "This assessment is intended for educational and self-reflection purposes only. It is not a diagnostic instrument or formal clinical relationship evaluation."
  },
  "dimensions": [
    {
      "key": "words_of_appreciation",
      "name": "Words of Appreciation",
      "description": "Verbal recognition, encouragement, sincere praise, and spoken emotional reassurance.",
      "display_order": 1
    },
    {
      "key": "quality_time",
      "name": "Quality Time",
      "description": "Focused attention, uninterrupted shared moments, deep presence, and active engagement.",
      "display_order": 2
    },
    {
      "key": "helpful_actions",
      "name": "Helpful Actions",
      "description": "Practical support, considerate assistance, and easing burdens through thoughtful effort.",
      "display_order": 3
    },
    {
      "key": "thoughtful_gifts",
      "name": "Thoughtful Gifts",
      "description": "Meaningful tokens, small unexpected gestures, and visual expressions of love.",
      "display_order": 4
    },
    {
      "key": "physical_affection",
      "name": "Physical Affection",
      "description": "Comforting touch, warm embraces, holding hands, and soothing physical closeness.",
      "display_order": 5
    }
  ],
  "questions": [
    {
      "id": "llq_q1",
      "text": "Receiving sincere verbal recognition for my efforts makes me feel deeply valued.",
      "type": "likert",
      "dimension_key": "words_of_appreciation",
      "order": 1,
      "required": true,
      "reverse_scored": false,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 1, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 2, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 4, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 5, "order": 5 }
      ]
    },
    {
      "id": "llq_q2",
      "text": "A few heartfelt words of reassurance from someone close quickly lifts my spirits.",
      "type": "likert",
      "dimension_key": "words_of_appreciation",
      "order": 2,
      "required": true,
      "reverse_scored": false,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 1, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 2, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 4, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 5, "order": 5 }
      ]
    },
    {
      "id": "llq_q3",
      "text": "Spoken compliments and verbal praise have relatively little impact on how connected I feel.",
      "type": "likert",
      "dimension_key": "words_of_appreciation",
      "order": 3,
      "required": true,
      "reverse_scored": true,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 5, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 4, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 2, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 1, "order": 5 }
      ]
    },
    {
      "id": "llq_q4",
      "text": "I appreciate when someone explicitly articulates what they admire or respect about me.",
      "type": "likert",
      "dimension_key": "words_of_appreciation",
      "order": 4,
      "required": true,
      "reverse_scored": false,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 1, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 2, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 4, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 5, "order": 5 }
      ]
    },
    {
      "id": "llq_q5",
      "text": "I rarely feel a need for people close to me to state their affection out loud.",
      "type": "likert",
      "dimension_key": "words_of_appreciation",
      "order": 5,
      "required": true,
      "reverse_scored": true,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 5, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 4, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 2, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 1, "order": 5 }
      ]
    },
    {
      "id": "llq_q6",
      "text": "Having uninterrupted, distraction-free one-on-one time makes me feel genuinely close to someone.",
      "type": "likert",
      "dimension_key": "quality_time",
      "order": 6,
      "required": true,
      "reverse_scored": false,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 1, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 2, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 4, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 5, "order": 5 }
      ]
    },
    {
      "id": "llq_q7",
      "text": "Engaging in deep, unhurried conversations is one of my favorite ways to bond.",
      "type": "likert",
      "dimension_key": "quality_time",
      "order": 7,
      "required": true,
      "reverse_scored": false,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 1, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 2, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 4, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 5, "order": 5 }
      ]
    },
    {
      "id": "llq_q8",
      "text": "I feel just as connected in a relationship even if we rarely spend focused time together.",
      "type": "likert",
      "dimension_key": "quality_time",
      "order": 8,
      "required": true,
      "reverse_scored": true,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 5, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 4, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 2, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 1, "order": 5 }
      ]
    },
    {
      "id": "llq_q9",
      "text": "Doing shared activities together with full mutual presence creates lasting closeness for me.",
      "type": "likert",
      "dimension_key": "quality_time",
      "order": 9,
      "required": true,
      "reverse_scored": false,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 1, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 2, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 4, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 5, "order": 5 }
      ]
    },
    {
      "id": "llq_q10",
      "text": "Frequent multitasking or device use during our shared time rarely bothers me.",
      "type": "likert",
      "dimension_key": "quality_time",
      "order": 10,
      "required": true,
      "reverse_scored": true,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 5, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 4, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 2, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 1, "order": 5 }
      ]
    },
    {
      "id": "llq_q11",
      "text": "When someone steps in to help lighten a demanding task, I feel deeply supported.",
      "type": "likert",
      "dimension_key": "helpful_actions",
      "order": 11,
      "required": true,
      "reverse_scored": false,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 1, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 2, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 4, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 5, "order": 5 }
      ]
    },
    {
      "id": "llq_q12",
      "text": "Practical acts of assistance when I am overwhelmed communicate care more than words.",
      "type": "likert",
      "dimension_key": "helpful_actions",
      "order": 12,
      "required": true,
      "reverse_scored": false,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 1, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 2, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 4, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 5, "order": 5 }
      ]
    },
    {
      "id": "llq_q13",
      "text": "I prefer handling all practical responsibilities alone and do not view assistance as an expression of care.",
      "type": "likert",
      "dimension_key": "helpful_actions",
      "order": 13,
      "required": true,
      "reverse_scored": true,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 5, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 4, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 2, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 1, "order": 5 }
      ]
    },
    {
      "id": "llq_q14",
      "text": "Noticing a need and taking care of it without being asked makes me feel truly cared for.",
      "type": "likert",
      "dimension_key": "helpful_actions",
      "order": 14,
      "required": true,
      "reverse_scored": false,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 1, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 2, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 4, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 5, "order": 5 }
      ]
    },
    {
      "id": "llq_q15",
      "text": "Whether someone helps me with daily chores has little bearing on my emotional security.",
      "type": "likert",
      "dimension_key": "helpful_actions",
      "order": 15,
      "required": true,
      "reverse_scored": true,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 5, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 4, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 2, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 1, "order": 5 }
      ]
    },
    {
      "id": "llq_q16",
      "text": "Receiving a small, unexpected token that reflects my personal interests brings me immense warmth.",
      "type": "likert",
      "dimension_key": "thoughtful_gifts",
      "order": 16,
      "required": true,
      "reverse_scored": false,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 1, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 2, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 4, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 5, "order": 5 }
      ]
    },
    {
      "id": "llq_q17",
      "text": "I cherish tangible keepsakes because they show that someone was thinking of me in my absence.",
      "type": "likert",
      "dimension_key": "thoughtful_gifts",
      "order": 17,
      "required": true,
      "reverse_scored": false,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 1, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 2, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 4, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 5, "order": 5 }
      ]
    },
    {
      "id": "llq_q18",
      "text": "Receiving physical gifts or presents does not significantly enhance my sense of being appreciated.",
      "type": "likert",
      "dimension_key": "thoughtful_gifts",
      "order": 18,
      "required": true,
      "reverse_scored": true,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 5, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 4, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 2, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 1, "order": 5 }
      ]
    },
    {
      "id": "llq_q19",
      "text": "A thoughtful surprise, regardless of its monetary cost, feels like a meaningful symbol of connection.",
      "type": "likert",
      "dimension_key": "thoughtful_gifts",
      "order": 19,
      "required": true,
      "reverse_scored": false,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 1, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 2, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 4, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 5, "order": 5 }
      ]
    },
    {
      "id": "llq_q20",
      "text": "I attach little emotional significance to souvenirs, cards, or material tokens.",
      "type": "likert",
      "dimension_key": "thoughtful_gifts",
      "order": 20,
      "required": true,
      "reverse_scored": true,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 5, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 4, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 2, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 1, "order": 5 }
      ]
    },
    {
      "id": "llq_q21",
      "text": "A warm, comforting embrace when greeting someone close creates an immediate sense of safety.",
      "type": "likert",
      "dimension_key": "physical_affection",
      "order": 21,
      "required": true,
      "reverse_scored": false,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 1, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 2, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 4, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 5, "order": 5 }
      ]
    },
    {
      "id": "llq_q22",
      "text": "I rarely seek physical closeness or gestures like hand-holding to feel emotionally secure.",
      "type": "likert",
      "dimension_key": "physical_affection",
      "order": 22,
      "required": true,
      "reverse_scored": true,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 5, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 4, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 2, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 1, "order": 5 }
      ]
    },
    {
      "id": "llq_q23",
      "text": "Gentle, affectionate physical contact helps me feel grounded and mutually understood.",
      "type": "likert",
      "dimension_key": "physical_affection",
      "order": 23,
      "required": true,
      "reverse_scored": false,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 1, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 2, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 4, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 5, "order": 5 }
      ]
    },
    {
      "id": "llq_q24",
      "text": "Non-verbal physical gestures hold minimal significance for my interpersonal bonding.",
      "type": "likert",
      "dimension_key": "physical_affection",
      "order": 24,
      "required": true,
      "reverse_scored": true,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 5, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 4, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 2, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 1, "order": 5 }
      ]
    },
    {
      "id": "llq_q25",
      "text": "Sharing close physical presence and reassuring touch fosters strong emotional intimacy for me.",
      "type": "likert",
      "dimension_key": "physical_affection",
      "order": 25,
      "required": true,
      "reverse_scored": false,
      "options": [
        { "text": "Strongly Disagree", "value": "1", "score": 1, "order": 1 },
        { "text": "Disagree", "value": "2", "score": 2, "order": 2 },
        { "text": "Neutral", "value": "3", "score": 3, "order": 3 },
        { "text": "Agree", "value": "4", "score": 4, "order": 4 },
        { "text": "Strongly Agree", "value": "5", "score": 5, "order": 5 }
      ]
    }
  ],
  "result_profiles": [
    {
      "name": "Words of Appreciation Primary",
      "dimension_key": "words_of_appreciation",
      "minimum_score": 20,
      "maximum_score": 25,
      "description": "You feel most cherished when affection is communicated through explicit verbal affirmation, thoughtful encouragement, and spoken gratitude."
    },
    {
      "name": "Quality Time Primary",
      "dimension_key": "quality_time",
      "minimum_score": 20,
      "maximum_score": 25,
      "description": "You experience deep emotional connection through undivided presence, shared experiences, and unhurried two-way dialogue."
    },
    {
      "name": "Helpful Actions Primary",
      "dimension_key": "helpful_actions",
      "minimum_score": 20,
      "maximum_score": 25,
      "description": "Practical support, considerate assistance, and reliable actions communicate love and respect most clearly to you."
    },
    {
      "name": "Thoughtful Gifts Primary",
      "dimension_key": "thoughtful_gifts",
      "minimum_score": 20,
      "maximum_score": 25,
      "description": "Tangible tokens and meaningful surprises represent thoughtful reminders of connection and mutual care for you."
    },
    {
      "name": "Physical Affection Primary",
      "dimension_key": "physical_affection",
      "minimum_score": 20,
      "maximum_score": 25,
      "description": "Comforting physical closeness, warm embraces, and reassuring touch form the cornerstone of your emotional intimacy."
    }
  ],
  "faqs": [
    {
      "question": "How are relationship preferences calculated?",
      "answer": "Your responses across all 25 items are mapped to 5 distinct interaction dimensions. The dimensions with your highest scores indicate your primary and secondary preferences for expressing and experiencing care."
    },
    {
      "question": "Can I have more than one primary love language?",
      "answer": "Yes. Many individuals have balanced profiles with tied or near-equal scores across two or more dimensions."
    }
  ],
  "seo": {
    "title": "Love Language Quiz | Discover Your Relational Connection Style",
    "description": "Take the free 25-question Love Language Quiz. Discover your primary connection style across appreciation, quality time, helpful actions, gifts, and affection."
  },
  "settings": {
    "allow_guest_taking": true,
    "instant_results": true
  }
};

const result = validateJson(payload);
console.log(JSON.stringify(result, null, 2));
