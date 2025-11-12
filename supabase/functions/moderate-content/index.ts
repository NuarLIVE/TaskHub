import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ModerationRequest {
  content: string;
  contentType: 'proposal' | 'message' | 'order' | 'task';
  contentId?: string;
}

interface ModerationResult {
  flagged: boolean;
  reasons: string[];
  confidence: number;
  action: 'none' | 'warning' | 'blocked';
  message?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ModerationRequest = await req.json();
    const { content, contentType, contentId } = body;

    if (!content) {
      return new Response(
        JSON.stringify({ error: 'Content is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = moderateContent(content);

    await supabase.from('moderation_logs').insert({
      user_id: user.id,
      content_type: contentType,
      content_id: contentId,
      original_content: content,
      flagged: result.flagged,
      flag_reasons: result.reasons,
      confidence_score: result.confidence,
      action_taken: result.action,
    });

    if (result.flagged && result.action !== 'none') {
      const severity = result.action === 'blocked' ? 3 : result.action === 'warning' ? 2 : 1;
      
      await supabase.from('user_warnings').insert({
        user_id: user.id,
        warning_type: result.reasons.join(', '),
        description: result.message || 'Content violates platform guidelines',
        severity,
      });

      const { data: profile } = await supabase
        .from('profiles')
        .select('warning_count')
        .eq('id', user.id)
        .single();

      await supabase
        .from('profiles')
        .update({ warning_count: (profile?.warning_count || 0) + 1 })
        .eq('id', user.id);
    }

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Moderation error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', flagged: false, reasons: [], confidence: 0, action: 'none' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function moderateContent(content: string): ModerationResult {
  const contentLower = content.toLowerCase();
  const reasons: string[] = [];
  let maxConfidence = 0;

  const profanityPatterns = [
    /\b(хуй|пизд|еба|ебл|бля|сука|мудак|гандон|пидор|дерьмо)\w*/gi,
    /\b(fuck|shit|bitch|asshole|damn|crap|bastard|dick|pussy)\w*/gi,
  ];

  for (const pattern of profanityPatterns) {
    if (pattern.test(contentLower)) {
      reasons.push('profanity');
      maxConfidence = Math.max(maxConfidence, 0.95);
      break;
    }
  }

  if (/\b(telegram|телеграм|телега|tg|whatsapp|ватсап|вотсап|viber|вайбер|skype|скайп|discord|дискорд)\b/gi.test(content)) {
    reasons.push('external_platform');
    maxConfidence = Math.max(maxConfidence, 0.90);
  }

  if (/@[a-zA-Z0-9_]{3,}/g.test(content)) {
    reasons.push('external_platform');
    maxConfidence = Math.max(maxConfidence, 0.85);
  }

  if (/\b(переходи|перейди|пиши|напиши|звони|позвони)\s+(в|на|мне)\s+(telegram|телеграм|whatsapp|viber|skype|discord)/gi.test(content)) {
    reasons.push('external_platform');
    maxConfidence = Math.max(maxConfidence, 0.95);
  }

  const phonePatterns = [
    /\+?[78][-\s]?\(?\d{3}\)?[-\s]?\d{3}[-\s]?\d{2}[-\s]?\d{2}/g,
    /\+?\d{10,15}/g,
    /\b\d{3}[-\s]?\d{3}[-\s]?\d{4}\b/g,
    /\b\d{5}[-\s]?\d{5}\b/g,
  ];

  for (const pattern of phonePatterns) {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      const hasEnoughDigits = matches.some(m => {
        const digits = m.replace(/\D/g, '');
        return digits.length >= 10;
      });
      if (hasEnoughDigits) {
        reasons.push('phone_number');
        maxConfidence = Math.max(maxConfidence, 0.95);
        break;
      }
    }
  }

  const externalPaymentPatterns = [
    /\b(оплат|плат|деньг|перевод|перевести|переведи)\w*\s+(мимо|вне|напрямую|через|на)\s+(платформ|сайт|карту|счет|киви|qiwi|paypal|пейпал)/gi,
    /\b(cash|кэш|наличн|карт|счет|перевод)\w*\s+(напрямую|мимо|вне)\s+(платформ|сайт)/gi,
    /\b(paypal|пейпал|qiwi|киви|webmoney|вебмани|яндекс\.деньги|yandex\.money)\b/gi,
  ];

  for (const pattern of externalPaymentPatterns) {
    if (pattern.test(contentLower)) {
      reasons.push('external_payment');
      maxConfidence = Math.max(maxConfidence, 0.85);
      break;
    }
  }

  const sexualContentPatterns = [
    /\b(секс|sex|интим|intimate|голая|голый|nude|naked|порно|porn|xxx|эротик|erotic)\w*/gi,
    /\b(минет|blowjob|оральн|oral|анал|anal|вагин|vagina|член|penis|грудь|breast|сиськ|tits|жопа|ass|попа|butt)\w*/gi,
    /\b(проститут|prostitut|эскорт|escort|секс[-\s]?услуг|sex[-\s]?service|интим[-\s]?услуг)\w*/gi,
    /\b(познаком|встреч|свидан|date|relationship)\w*\s+(для|за|с)\s+(секс|интим|ночь|постел)/gi,
  ];

  for (const pattern of sexualContentPatterns) {
    if (pattern.test(contentLower)) {
      reasons.push('sexual_content');
      maxConfidence = Math.max(maxConfidence, 0.95);
      break;
    }
  }

  const drugsPatterns = [
    /\b(кокаин|cocaine|героин|heroin|мефедрон|mephedrone|амфетамин|amphetamine|спайс|spice|марихуана|marijuana|гашиш|hashish|lsd|экстази|ecstasy|mdma)\w*/gi,
    /\b(наркотик|drug|дурь|трава|план|stuff|weed|joint)\w*/gi,
    /\b(курительн|смеси|миксы|закладк|закладки)\w*/gi,
    /\b(соль|альфа|мет|бошки|шишки|твердый|мягкий)\b/gi,
  ];

  for (const pattern of drugsPatterns) {
    if (pattern.test(contentLower)) {
      reasons.push('drugs');
      maxConfidence = Math.max(maxConfidence, 0.95);
      break;
    }
  }

  const flagged = reasons.length > 0;
  let action: 'none' | 'warning' | 'blocked' = 'none';
  let message = '';

  if (flagged) {
    if (reasons.includes('drugs')) {
      action = 'blocked';
      message = 'Объявление содержит запрещённый контент связанный с наркотиками. Пожалуйста, измените его содержание или напишите в поддержку.';
    }

    if (reasons.includes('sexual_content')) {
      action = 'blocked';
      message = 'Объявление содержит запрещённый контент сексуального характера. Пожалуйста, измените его содержание или напишите в поддержку.';
    }

    if (reasons.includes('profanity')) {
      action = 'blocked';
      message = 'Объявление содержит ненормативную лексику. Пожалуйста, измените его содержание или напишите в поддержку.';
    }

    if (reasons.includes('external_payment')) {
      action = 'blocked';
      message = 'Объявление содержит запрещённый контент. Запрещена оплата вне платформы. Пожалуйста, измените его содержание или напишите в поддержку.';
    }

    if (reasons.includes('external_platform') || reasons.includes('phone_number')) {
      action = 'blocked';
      message = 'Объявление содержит запрещённый контент. Запрещены контактные данные и ссылки на другие платформы. Пожалуйста, измените его содержание или напишите в поддержку.';
    }
  }

  return {
    flagged,
    reasons: Array.from(new Set(reasons)),
    confidence: maxConfidence,
    action,
    message,
  };
}
