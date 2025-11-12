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

    const result = await moderateContent(content);

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

      await supabase.from('profiles')
        .update({ warning_count: supabase.raw('warning_count + 1') })
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

  const externalPlatformPatterns = [
    /\b(telegram|телеграм|телега|tg|whatsapp|ватсап|вотсап|viber|вайбер|skype|скайп|discord|дискорд)\b/gi,
    /\b(переходи|перейди|пиши|напиши|звони|позвони)\s+(в|на|мне)\s+(telegram|телеграм|whatsapp|viber|skype|discord)/gi,
    /@\w+/g,
  ];

  for (const pattern of externalPlatformPatterns) {
    const matches = contentLower.match(pattern);
    if (matches) {
      if (matches.some(m => m.startsWith('@') && m.length > 1)) {
        reasons.push('external_platform');
        maxConfidence = Math.max(maxConfidence, 0.85);
        break;
      } else if (matches.length >= 2) {
        reasons.push('external_platform');
        maxConfidence = Math.max(maxConfidence, 0.80);
        break;
      }
    }
  }

  const phonePatterns = [
    /\+?[78]\s?[-(]?\d{3}[)-]?\s?\d{3}[-\s]?\d{2}[-\s]?\d{2}/g,
    /\+?\d{1,3}[-\s]?\(?\d{2,4}\)?[-\s]?\d{2,4}[-\s]?\d{2,4}[-\s]?\d{2,4}/g,
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
        maxConfidence = Math.max(maxConfidence, 0.90);
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

  const flagged = reasons.length > 0;
  let action: 'none' | 'warning' | 'blocked' = 'none';
  let message = '';

  if (flagged) {
    if (reasons.includes('profanity')) {
      action = 'warning';
      message = 'Обнаружена ненормативная лексика. Пожалуйста, общайтесь уважительно.';
    }
    
    if (reasons.includes('external_payment')) {
      action = 'blocked';
      message = 'Запрещена оплата вне платформы. Все платежи должны проходить через защищенную систему платформы.';
    }
    
    if (reasons.includes('external_platform') || reasons.includes('phone_number')) {
      action = 'blocked';
      message = 'Запрещено предлагать переход на другие платформы или обмен контактными данными на этом этапе.';
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
