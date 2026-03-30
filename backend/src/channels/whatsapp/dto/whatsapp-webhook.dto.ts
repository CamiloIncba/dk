/**
 * DTOs for WhatsApp Business API (Cloud API) webhooks.
 * Reference: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/
 */

export class WhatsAppContact {
  profile: { name: string };
  wa_id: string;
}

export class WhatsAppTextMessage {
  body: string;
}

export class WhatsAppInteractiveReply {
  type: 'button_reply' | 'list_reply';
  button_reply?: { id: string; title: string };
  list_reply?: { id: string; title: string; description?: string };
}

export class WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'interactive' | 'image' | 'location' | 'order';
  text?: WhatsAppTextMessage;
  interactive?: WhatsAppInteractiveReply;
}

export class WhatsAppStatusUpdate {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
}

export class WhatsAppWebhookEntry {
  id: string;
  changes: Array<{
    value: {
      messaging_product: string;
      metadata: { display_phone_number: string; phone_number_id: string };
      contacts?: WhatsAppContact[];
      messages?: WhatsAppMessage[];
      statuses?: WhatsAppStatusUpdate[];
    };
    field: string;
  }>;
}

export class WhatsAppWebhookDto {
  object: string;
  entry: WhatsAppWebhookEntry[];
}
