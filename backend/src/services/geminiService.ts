import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeneratedQuestion {
  id: string;
  text: string;
  type: 'mcq' | 'short-answer' | 'long-answer' | 'numerical' | 'descriptive';
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  options?: string[]; // For MCQ
  sampleAnswer?: string;
  topic?: string;
}

interface GenerateQuestionsParams {
  topic: string;
  subject?: string;
  questionCount: number;
  marks?: number[];
  difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
  fileContent?: string;
  additionalContext?: string;
}

/**
 * Initialize Gemini client
 */
const initializeGemini = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not set');
  }
  
  return new GoogleGenerativeAI(apiKey);
};

/**
 * Build prompt for question generation using LearnLM Academic Framework
 */
const buildQuestionPrompt = (params: GenerateQuestionsParams): string => {
  const {
    topic,
    subject,
    questionCount,
    marks,
    difficulty,
    fileContent,
    additionalContext
  } = params;

  let prompt = `You are an expert academic instructor and assessment designer.

Your task is to generate a high-quality assignment question paper based on the following requirements.

---

## 📥 INPUT DETAILS

**Assignment Context:**
* Topic: ${topic}`;

  if (subject) {
    prompt += `\n* Subject: ${subject}`;
  }

  prompt += `\n* Total Questions Required: ${questionCount}`;

  if (marks && marks.length > 0) {
    prompt += `\n* Marks per Question: ${marks.join(', ')} marks (total: ${marks.reduce((a, b) => a + b, 0)} marks)`;
  }

  if (additionalContext) {
    prompt += `\n* Special Instructions: ${additionalContext}`;
  }

  if (fileContent) {
    prompt += `\n\n**Study Material Reference:**\n---MATERIAL START---\n${fileContent}\n---MATERIAL END---`;
    prompt += `\n\nIMPORTANT: Create questions ONLY based on the provided study material above.`;
  }

  prompt += `\n\n---

## 🧠 INSTRUCTIONS (LearnLM Style)

### Step 1: Understand Context
Identify the subject, topics, and learning depth from the provided information.

### Step 2: Plan Question Distribution
Distribute ${questionCount} questions across difficulty levels:
* Easy (≈30%): Basic recall and comprehension
* Medium (≈50%): Application and analysis
* Hard (≈20%): Evaluation and synthesis

Ensure variety in question types: MCQ, Short Answer (short-answer), Long Answer (long-answer), Numerical (numerical), Descriptive (descriptive)

### Step 3: Generate Questions
For EACH question:
* Make it clear, unambiguous, and assessment-ready
* Align with assigned marks and stated difficulty
* Ensure correctness and relevance to topic
* Avoid repetition

### Step 4: Add Complete Teaching Support
For every question:
* Provide a comprehensive **sampleAnswer**
* For MCQs: Provide exactly 4 options with only ONE correct answer
* For numerical: Include final answer and key calculation steps
* For essay-type: Provide answer key points or expected content

### Step 5: Strict JSON Output Format

---

## 📤 OUTPUT (STRICTLY JSON ONLY - NO MARKDOWN, NO TEXT)

Return ONLY a valid JSON object - absolutely nothing else:

{
  "questions": [
    {
      "id": "q1",
      "text": "Question text here",
      "type": "mcq",
      "marks": 5,
      "difficulty": "easy",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "sampleAnswer": "Correct answer or key points",
      "topic": "Topic name"
    }
  ]
}

DO NOT include markdown backticks, code blocks, or any text before or after the JSON.

---

## ⚠️ CRITICAL RULES

✔ Total questions MUST equal ${questionCount}
✔ Question types MUST be balanced (variety)
✔ Question TYPE field MUST use EXACTLY one of: "mcq", "short-answer", "long-answer", "numerical", "descriptive" (use hyphens, NOT underscores)
✔ Difficulty MUST be: ~${Math.ceil(questionCount * 0.3)} easy, ~${Math.ceil(questionCount * 0.5)} medium, ~${Math.ceil(questionCount * 0.2)} hard
✔ Marks MUST match configuration: ${marks && marks.length > 0 ? 'Use provided values' : 'Assign reasonably'}
✔ JSON MUST be valid and parseable
✔ NO explanations outside JSON
✔ EVERY question MUST have sampleAnswer
✔ MCQ options MUST be distinct and realistic

---

## ✅ VERIFICATION CHECKLIST

Before returning output, verify:
* ✔ Exactly ${questionCount} questions generated
* ✔ All required fields present in each question
* ✔ JSON is syntactically valid
* ✔ No question is repeated
* ✔ All answers are accurate
* ✔ Difficulty distribution is balanced
* ✔ Question types show variety

---

Now generate the assignment following ALL above guidelines.`;

  return prompt;
};

/**
 * Parse Gemini response to extract questions
 */
const parseGeminiResponse = (response: string): GeneratedQuestion[] => {
  try {
    // Remove markdown code block markers
    let cleanResponse = response.trim();
    if (cleanResponse.startsWith('```json')) {
      cleanResponse = cleanResponse.slice(7); // Remove ```json
    }
    if (cleanResponse.startsWith('```')) {
      cleanResponse = cleanResponse.slice(3); // Remove ```
    }
    if (cleanResponse.endsWith('```')) {
      cleanResponse = cleanResponse.slice(0, -3); // Remove trailing ```
    }
    cleanResponse = cleanResponse.trim();

    // Find the JSON object - look for opening brace
    const startIdx = cleanResponse.indexOf('{');
    if (startIdx === -1) {
      console.error('Response start:', cleanResponse.substring(0, 200));
      throw new Error('No JSON object found in response');
    }

    // Find the matching closing brace for the JSON object
    let braceCount = 0;
    let endIdx = -1;
    for (let i = startIdx; i < cleanResponse.length; i++) {
      if (cleanResponse[i] === '{') braceCount++;
      else if (cleanResponse[i] === '}') {
        braceCount--;
        if (braceCount === 0) {
          endIdx = i + 1;
          break;
        }
      }
    }

    if (endIdx === -1) {
      console.error('Response:', cleanResponse.substring(0, 300));
      throw new Error('No complete JSON object found - response may be truncated');
    }

    const jsonStr = cleanResponse.substring(startIdx, endIdx);
    const parsed = JSON.parse(jsonStr);

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('Invalid response format: questions array not found');
    }

    if (parsed.questions.length === 0) {
      throw new Error('Empty questions array in response');
    }

    return parsed.questions as GeneratedQuestion[];
  } catch (error) {
    console.error('Error parsing Gemini response:', error);
    throw new Error(`Failed to parse question data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Generate questions using Gemini API
 */
export const generateQuestions = async (
  params: GenerateQuestionsParams
): Promise<GeneratedQuestion[]> => {
  try {
    const client = initializeGemini();
    const model = client.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = buildQuestionPrompt(params);

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Log raw response for debugging
    console.log('Raw Gemini response length:', responseText.length);
    console.log('Raw response preview:', responseText.substring(0, 800));

    const questions = parseGeminiResponse(responseText);

    // Normalize question types (replace underscores with hyphens)
    questions.forEach(q => {
      if (q.type && typeof q.type === 'string') {
        q.type = q.type.replace(/_/g, '-') as any;
      }
    });

    // Validate we got the requested number of questions
    if (questions.length !== params.questionCount) {
      console.warn(
        `Expected ${params.questionCount} questions, got ${questions.length}`
      );
    }

    // Validate each question has required fields
    questions.forEach((q, idx) => {
      if (!q.text || !q.type || q.marks === undefined) {
        throw new Error(`Question ${idx + 1} missing required fields: text="${q.text}", type="${q.type}", marks=${q.marks}`);
      }
      if (q.type === 'mcq' && (!q.options || q.options.length !== 4)) {
        const optionCount = q.options ? q.options.length : 0;
        throw new Error(`Question ${idx + 1} is MCQ but has ${optionCount} options instead of 4`);
      }
      if (!q.sampleAnswer) {
        throw new Error(`Question ${idx + 1} missing sampleAnswer`);
      }
    });

    console.log(`Successfully generated and validated ${questions.length} questions`);
    return questions;
  } catch (error) {
    console.error('Error generating questions:', error);
    throw error;
  }
};

/**
 * Generate questions with file content support
 */
export const generateQuestionsWithFile = async (
  params: GenerateQuestionsParams & { fileContent: string }
): Promise<GeneratedQuestion[]> => {
  return generateQuestions(params);
};

/**
 * Validate generated questions - throws detailed errors
 */
export const validateQuestions = (questions: GeneratedQuestion[]): boolean => {
  if (!Array.isArray(questions)) {
    throw new Error('questions is not an array');
  }

  if (questions.length === 0) {
    throw new Error('questions array is empty');
  }

  const requiredFields = ['id', 'text', 'type', 'marks', 'difficulty'];
  const validTypes = ['mcq', 'short-answer', 'long-answer', 'numerical', 'descriptive'];

  for (let idx = 0; idx < questions.length; idx++) {
    const question = questions[idx];

    // Check required fields
    for (const field of requiredFields) {
      if (!(field in question) || (question as any)[field] === undefined) {
        throw new Error(`Question ${idx + 1}: Missing required field "${field}". Question: ${JSON.stringify(question).substring(0, 100)}`);
      }
    }

    // Validate type
    if (!validTypes.includes(question.type)) {
      throw new Error(`Question ${idx + 1}: Invalid type "${question.type}". Must be one of: ${validTypes.join(', ')}`);
    }

    // Validate marks is positive
    if (question.marks <= 0) {
      throw new Error(`Question ${idx + 1}: marks must be positive, got ${question.marks}`);
    }

    // Validate difficulty
    if (!['easy', 'medium', 'hard'].includes(question.difficulty)) {
      throw new Error(`Question ${idx + 1}: Invalid difficulty "${question.difficulty}". Must be: easy, medium, or hard`);
    }

    // For MCQ, validate options
    if (question.type === 'mcq') {
      if (!question.options || question.options.length < 2) {
        const optCount = question.options ? question.options.length : 0;
        throw new Error(`Question ${idx + 1}: MCQ must have at least 2 options, got ${optCount}`);
      }
    }
  }

  console.log(`✓ All ${questions.length} questions passed validation`);
  return true;
};
