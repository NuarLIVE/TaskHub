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

function parseDayOfWeek(text: string): Date | null {
  const days: Record<string, number> = {
    'понедельник': 1, 'вторник': 2, 'среда': 3, 'четверг': 4,
    'пятница': 5, 'пятницу': 5, 'суббота': 6, 'воскресенье': 0,
  };

  const lowerText = text.toLowerCase();
  for (const [dayName, dayNum] of Object.entries(days)) {
    if (lowerText.includes(dayName)) {
      const today = new Date();
      const currentDay = today.getDay();
      let daysToAdd = dayNum - currentDay;

      if (daysToAdd <= 0) {
        daysToAdd += 7;
      }

      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysToAdd);
      targetDate.setHours(23, 59, 59, 999);

      return targetDate;
    }
  }

  return null;
}

function parseRelativeDate(text: string): Date | null {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('сегодня')) {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today;
  }

  if (lowerText.includes('завтра')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);
    return tomorrow;
  }

  const relativePattern = /(?:через|за)\s+(\d+)\s*(день|дня|дней|неделю|недели|недель|месяц|месяца|месяцев)/i;
  const match = relativePattern.exec(lowerText);

  if (match) {
    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    const targetDate = new Date();

    if (unit.includes('день')) {
      targetDate.setDate(targetDate.getDate() + amount);
    } else if (unit.includes('недел')) {
      targetDate.setDate(targetDate.getDate() + amount * 7);
    } else if (unit.includes('месяц')) {
      targetDate.setMonth(targetDate.getMonth() + amount);
    }

    targetDate.setHours(23, 59, 59, 999);
    return targetDate;
  }

  return null;
}

function parseAbsoluteDate(text: string): Date | null {
  const datePattern = /(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?/;
  const match = datePattern.exec(text);

  if (match) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]) - 1;
    const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
    const fullYear = year < 100 ? 2000 + year : year;

    const date = new Date(fullYear, month, day, 23, 59, 59, 999);

    if (!isNaN(date.getTime()) && date > new Date()) {
      return date;
    }
  }

  return null;
}

function extractPriceChanges(text: string): { additions: number; subtractions: number; total: number } {
  const lowerText = text.toLowerCase();
  let additions = 0;
  let subtractions = 0;

  const additionPatterns = [
    /(?:добавить|доплата|плюс|дополнительно|\+)\s*([\d,\.]+)\s*(usd|eur|rub|kzt|pln|\$|€|₽|₸|zł)?/gi,
  ];

  const subtractionPatterns = [
    /(?:вычесть|минус|скидка|-)\s*([\d,\.]+)\s*(usd|eur|rub|kzt|pln|\$|€|₽|₸|zł)?/gi,
  ];

  for (const pattern of additionPatterns) {
    let match;
    while ((match = pattern.exec(lowerText)) !== null) {
      const price = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(price) && price > 0) {
        additions += price;
      }
    }
  }

  for (const pattern of subtractionPatterns) {
    let match;
    while ((match = pattern.exec(lowerText)) !== null) {
      const price = parseFloat(match[1].replace(',', '.'));
      if (!isNaN(price) && price > 0) {
        subtractions += price;
      }
    }
  }

  return { additions, subtractions, total: additions - subtractions };
}

function extractOrderTitle(text: string, existingTitle?: string): string | null {
  if (existingTitle && existingTitle.length > 0) {
    return null;
  }

  const titlePatterns = [
    /(?:проект|заказ|работа)\s+(?:по|на)?\s*[«"]?([^.!?\n«»"]{10,80})[»"]?/i,
    /(?:нужно|надо|требуется|сделать)\s+([^.!?\n]{15,80})/i,
  ];

  for (const pattern of titlePatterns) {
    const match = pattern.exec(text);
    if (match && match[1]) {
      const title = match[1].trim();
      if (title.length >= 10) {
        return title.slice(0, 100);
      }
    }
  }

  return null;
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

    const updates: Partial<CRMContext> = {};
    const text = message_text.toLowerCase();

    const priceChanges = extractPriceChanges(message_text);
    if (priceChanges.additions > 0 || priceChanges.subtractions > 0) {
      const currentPrice = crmContext?.total_price || 0;
      updates.total_price = currentPrice + priceChanges.total;
    }

    const pricePatterns = [
      /(?:цена|стоимость|бюджет|оплата)[:\s]*([\d,\.]+)\s*(usd|eur|rub|kzt|pln|\$|€|₽|₸|zł)?/gi,
      /(\d+)\s*(usd|eur|rub|kzt|pln|\$|€|₽|₸|zł)/gi,
    ];

    for (const pattern of pricePatterns) {
      const match = pattern.exec(text);
      if (match) {
        const price = parseFloat(match[1].replace(',', '.'));
        if (price > 0 && !isNaN(price) && !updates.total_price) {
          updates.total_price = price;
          const currencyMatch = match[2]?.toLowerCase();
          if (currencyMatch) {
            const currencyMap: Record<string, string> = {
              '$': 'USD', '€': 'EUR', '₽': 'RUB', '₸': 'KZT', 'zł': 'PLN',
              'usd': 'USD', 'eur': 'EUR', 'rub': 'RUB', 'kzt': 'KZT', 'pln': 'PLN',
            };
            updates.currency = currencyMap[currencyMatch] || 'USD';
          }
        }
        break;
      }
    }

    let deadline = parseDayOfWeek(message_text);
    if (!deadline) deadline = parseRelativeDate(message_text);
    if (!deadline) deadline = parseAbsoluteDate(message_text);

    if (deadline && deadline > new Date()) {
      updates.deadline = deadline.toISOString();
    }

    if (/\b(срочно|urgent|высок|критич|важно)\b/i.test(text)) {
      updates.priority = 'high';
    } else if (/\b(средний|нормальн|обычн)\b/i.test(text)) {
      updates.priority = 'medium';
    } else if (/\b(не\s*срочно|низк|можно\s*подождать)\b/i.test(text)) {
      updates.priority = 'low';
    }

    const orderTitle = extractOrderTitle(message_text, crmContext?.order_title);
    if (orderTitle) {
      updates.order_title = orderTitle;
    }

    const taskPatterns = [
      /(?:задач[аи]|task)[:\s]*([^.!?\n]{5,100})/gi,
      /(?:\d+[.):]\s*)([^\n]{5,100})/g,
      /(?:^|\n)[-•*]\s+([^\n]{5,100})/g,
    ];

    const currentTasks = (crmContext?.tasks as Task[]) || [];

    for (const pattern of taskPatterns) {
      let match;
      while ((match = pattern.exec(message_text)) !== null) {
        const taskTitle = match[1]?.trim();
        if (taskTitle && taskTitle.length > 5) {
          const taskExists = currentTasks.some((t: Task) =>
            t.title.toLowerCase() === taskTitle.toLowerCase()
          );
          if (!taskExists) {
            currentTasks.push({
              title: taskTitle.slice(0, 200),
              status: 'pending',
              description: '',
            });
          }
        }
      }
    }

    if (currentTasks.length > ((crmContext?.tasks as Task[])?.length || 0)) {
      updates.tasks = currentTasks;
    }

    const existingNotes = crmContext?.notes || '';
    const timestamp = new Date().toLocaleString('ru-RU');
    const senderLabel = sender_id === crmContext?.client_id ? 'Клиент' : 'Исполнитель';

    if (Object.keys(updates).length > 0) {
      const noteUpdates = [];
      if (updates.total_price) noteUpdates.push(`цена ${updates.total_price} ${updates.currency || 'USD'}`);
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
