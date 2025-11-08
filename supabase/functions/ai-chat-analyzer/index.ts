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

interface CRMContext {
  client_id?: string;
  executor_id?: string;
  order_title?: string;
  agreed_price?: number;
  currency?: string;
  deadline?: string;
  priority?: string;
  tasks?: Array<{ title: string; status: string; description?: string }>;
  notes?: string;
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

    // Get chat info to determine roles
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

    // Get existing CRM context
    let { data: crmContext } = await supabase
      .from('chat_crm_context')
      .select('*')
      .eq('chat_id', chat_id)
      .maybeSingle();

    // Initialize CRM context if it doesn't exist
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

    // Simple AI analysis using pattern matching
    const updates: Partial<CRMContext> = {};
    const text = message_text.toLowerCase();

    // Extract price mentions
    const pricePatterns = [
      /(?:цена|стоимость|бюджет|оплата)[:\s]*([\d,\.]+)\s*(usd|eur|rub|kzt|pln|\$|€|₽|₸|zł)?/gi,
      /(\d+)\s*(usd|eur|rub|kzt|pln|\$|€|₽|₸|zł)/gi,
    ];
    
    for (const pattern of pricePatterns) {
      const match = pattern.exec(text);
      if (match) {
        const price = parseFloat(match[1].replace(',', '.'));
        if (price > 0 && !isNaN(price)) {
          updates.agreed_price = price;
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

    // Extract deadline mentions
    const deadlinePatterns = [
      /(?:срок|дедлайн|до|к)[:\s]*(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?/gi,
      /(?:через|за)[:\s]*(\d+)\s*(день|дня|дней|день|недел|месяц)/gi,
    ];

    for (const pattern of deadlinePatterns) {
      const match = pattern.exec(text);
      if (match) {
        if (match[2] && match[1]) {
          // Date format dd.mm.yyyy
          const day = parseInt(match[1]);
          const month = parseInt(match[2]) - 1;
          const year = match[3] ? parseInt(match[3]) : new Date().getFullYear();
          const deadline = new Date(year, month, day);
          if (!isNaN(deadline.getTime())) {
            updates.deadline = deadline.toISOString();
          }
        } else if (match[1]) {
          // Relative time (e.g., "через 5 дней")
          const amount = parseInt(match[1]);
          const unit = match[2]?.toLowerCase() || '';
          const deadline = new Date();
          
          if (unit.includes('день')) {
            deadline.setDate(deadline.getDate() + amount);
          } else if (unit.includes('недел')) {
            deadline.setDate(deadline.getDate() + amount * 7);
          } else if (unit.includes('месяц')) {
            deadline.setMonth(deadline.getMonth() + amount);
          }
          
          updates.deadline = deadline.toISOString();
        }
        break;
      }
    }

    // Extract priority
    if (/\b(срочно|urgent|высок|критич|приоритет)\b/i.test(text)) {
      updates.priority = 'high';
    } else if (/\b(не\s*срочно|низк|можно\s*подождать)\b/i.test(text)) {
      updates.priority = 'low';
    }

    // Extract order title if not set
    if (!crmContext?.order_title || crmContext.order_title === '') {
      const titlePatterns = [
        /(?:заказ|проект|задача|работа)[:\s]+([^.!?\n]{10,100})/i,
        /(?:нужно|надо|требуется)[:\s]+([^.!?\n]{10,100})/i,
      ];
      
      for (const pattern of titlePatterns) {
        const match = pattern.exec(message_text);
        if (match && match[1]) {
          updates.order_title = match[1].trim().slice(0, 100);
          break;
        }
      }
    }

    // Extract tasks
    const taskPatterns = [
      /(?:задач[аи]|task)[:\s]*([^.!?\n]+)/gi,
      /(?:\d+[.):]\s*)([^\n]{5,100})/g,
      /(?:^|\n)[-•*]\s+([^\n]{5,100})/g,
    ];

    const currentTasks = (crmContext?.tasks as any[]) || [];
    
    for (const pattern of taskPatterns) {
      let match;
      while ((match = pattern.exec(message_text)) !== null) {
        const taskTitle = match[1]?.trim();
        if (taskTitle && taskTitle.length > 5) {
          const taskExists = currentTasks.some((t: any) => 
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

    if (currentTasks.length > (crmContext?.tasks as any[])?.length) {
      updates.tasks = currentTasks;
    }

    // Add note about the message
    const existingNotes = crmContext?.notes || '';
    const timestamp = new Date().toLocaleString('ru-RU');
    const senderLabel = sender_id === crmContext?.client_id ? 'Клиент' : 'Исполнитель';
    
    if (Object.keys(updates).length > 0) {
      const noteUpdates = [];
      if (updates.agreed_price) noteUpdates.push(`цена ${updates.agreed_price} ${updates.currency || 'USD'}`);
      if (updates.deadline) noteUpdates.push(`срок до ${new Date(updates.deadline).toLocaleDateString('ru-RU')}`);
      if (updates.priority) noteUpdates.push(`приоритет ${updates.priority}`);
      if (updates.order_title) noteUpdates.push(`проект: ${updates.order_title}`);
      
      if (noteUpdates.length > 0) {
        const newNote = `[${timestamp}] ${senderLabel}: ${noteUpdates.join(', ')}`;
        updates.notes = existingNotes ? `${existingNotes}\n${newNote}` : newNote;
      }
    }

    // Update CRM context if there are changes
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
