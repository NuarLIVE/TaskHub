import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface AnalysisRequest {
  chat_id: string;
  message_id: string;
  message_text: string;
  sender_id: string;
}

interface Task {
  title: string;
  status: string;
  description?: string;
  price?: number;
  deadline?: string;
  delivery_date?: string;
}

interface CRMContext {
  client_id?: string;
  executor_id?: string;
  order_title?: string;
  total_price?: number;
  currency?: string;
  deadline?: string;
  priority?: string;
  tasks?: Task[];
  notes?: string;
}

async function analyzeWithAI(messageText: string, existingContext: any): Promise<Partial<CRMContext>> {
  try {
    const today = new Date();
    const todayStr = today.toLocaleDateString('ru-RU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const prompt = `Ты система анализа деловых сообщений для CRM. Сегодня: ${todayStr}.

Текущий контекст:
- Название заказа: ${existingContext?.order_title || 'не указано'}
- Цена: ${existingContext?.total_price || 0} ${existingContext?.currency || 'USD'}
- Дедлайн: ${existingContext?.deadline ? new Date(existingContext.deadline).toLocaleDateString('ru-RU') : 'не указан'}
- Приоритет: ${existingContext?.priority || 'medium'}

Новое сообщение: "${messageText}"

ВАЖНО: Прошлые даты запрещены! Только будущие даты.

Проанализируй сообщение и извлеки в JSON формате:
{
  "order_title": "тематическое название проекта (если упоминается)",
  "price_change": {
    "type": "set|add|subtract",
    "amount": число,
    "currency": "USD|EUR|RUB|KZT|PLN"
  },
  "deadline": "YYYY-MM-DD или null (только будущая дата)",
  "priority": "low|medium|high или null",
  "tasks": [{"title": "название задачи", "description": "описание"}],
  "notes": "краткая заметка о том, что обсуждалось"
}

Примеры анализа:
- "Цена 500 долларов" → price_change: {type: "set", amount: 500, currency: "USD"}
- "Добавь 100" → price_change: {type: "add", amount: 100}
- "Минус 50" → price_change: {type: "subtract", amount: 50}
- "К пятнице" → deadline: следующая пятница
- "Срочно!" → priority: "high"
- "Проект по дизайну сайта" → order_title: "Дизайн сайта"

Ответ только JSON, без комментариев:`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('GROQ_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: 'Ты эксперт по анализу деловой переписки. Отвечай только валидным JSON без markdown форматирования.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content || '{}';

    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : aiResponse;
    const analysis = JSON.parse(jsonStr);

    const updates: Partial<CRMContext> = {};

    if (analysis.order_title && !existingContext?.order_title) {
      updates.order_title = analysis.order_title.slice(0, 100);
    }

    if (analysis.price_change && analysis.price_change.amount > 0) {
      const currentPrice = existingContext?.total_price || 0;
      switch (analysis.price_change.type) {
        case 'set':
          updates.total_price = analysis.price_change.amount;
          break;
        case 'add':
          updates.total_price = currentPrice + analysis.price_change.amount;
          break;
        case 'subtract':
          updates.total_price = Math.max(0, currentPrice - analysis.price_change.amount);
          break;
      }
      if (analysis.price_change.currency) {
        updates.currency = analysis.price_change.currency;
      }
    }

    if (analysis.deadline) {
      const deadlineDate = new Date(analysis.deadline);
      if (!isNaN(deadlineDate.getTime()) && deadlineDate > new Date()) {
        updates.deadline = deadlineDate.toISOString();
      }
    }

    if (analysis.priority && ['low', 'medium', 'high'].includes(analysis.priority)) {
      updates.priority = analysis.priority;
    }

    if (analysis.tasks && Array.isArray(analysis.tasks) && analysis.tasks.length > 0) {
      const currentTasks = (existingContext?.tasks as Task[]) || [];
      const newTasks = analysis.tasks
        .filter((t: any) => t.title && t.title.length > 3)
        .map((t: any) => ({
          title: t.title.slice(0, 200),
          status: 'pending',
          description: t.description || '',
        }));

      const uniqueNewTasks = newTasks.filter((newTask: Task) =>
        !currentTasks.some((existingTask: Task) =>
          existingTask.title.toLowerCase() === newTask.title.toLowerCase()
        )
      );

      if (uniqueNewTasks.length > 0) {
        updates.tasks = [...currentTasks, ...uniqueNewTasks];
      }
    }

    return updates;

  } catch (error) {
    console.error('AI Analysis error:', error);
    return {};
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { chat_id, message_text, sender_id }: AnalysisRequest = await req.json();

    const { data: chat } = await supabase
      .from('chats')
      .select('participant1_id, participant2_id')
      .eq('id', chat_id)
      .single();

    if (!chat) {
      return new Response(
        JSON.stringify({ error: 'Chat not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let { data: crmContext } = await supabase
      .from('chat_crm_context')
      .select('*')
      .eq('chat_id', chat_id)
      .maybeSingle();

    if (!crmContext) {
      const { data: newContext } = await supabase
        .from('chat_crm_context')
        .insert({
          chat_id,
          client_id: chat.participant1_id,
          executor_id: chat.participant2_id,
          tasks: [],
          notes: '',
        })
        .select()
        .single();
      crmContext = newContext;
    }

    const updates = await analyzeWithAI(message_text, crmContext);

    const existingNotes = crmContext?.notes || '';
    const timestamp = new Date().toLocaleString('ru-RU');
    const senderLabel = sender_id === crmContext?.client_id ? 'Клиент' : 'Исполнитель';

    if (Object.keys(updates).length > 0) {
      const noteUpdates = [];
      if (updates.total_price !== undefined) noteUpdates.push(`цена ${updates.total_price} ${updates.currency || crmContext?.currency || 'USD'}`);
      if (updates.deadline) noteUpdates.push(`срок до ${new Date(updates.deadline).toLocaleDateString('ru-RU')}`);
      if (updates.priority) noteUpdates.push(`приоритет ${updates.priority}`);
      if (updates.order_title) noteUpdates.push(`проект: ${updates.order_title}`);

      if (noteUpdates.length > 0) {
        const newNote = `[${timestamp}] ${senderLabel}: ${noteUpdates.join(', ')}`;
        updates.notes = existingNotes ? `${existingNotes}\n${newNote}` : newNote;
      }
    }

    if (Object.keys(updates).length > 0) {
      await supabase
        .from('chat_crm_context')
        .update(updates)
        .eq('chat_id', chat_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        updates: Object.keys(updates).length,
        extracted: updates
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error analyzing message:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
