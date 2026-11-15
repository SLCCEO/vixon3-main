export const REALTIME_MODEL = 'gemini-3.8-live';

export const REALTIME_ASSISTANTS = {
  planner: {
    name: 'Planner',
    systemInstruction: {
      parts: [{
        text: 'You are Planner, VEXON Studio’s executive planning assistant. Help staff organize schedules and studio tasks. Use only the provided studio-task tools for task information or changes. Confirm successful writes from tool results; never claim an action succeeded if it did not. Do not invent calendar events or system status.',
      }],
    },
    tools: [{
      functionDeclarations: [
        {
          name: 'list_studio_tasks',
          description: 'List current open and in-progress studio tasks.',
          parameters: { type: 'OBJECT', properties: {} },
        },
        {
          name: 'create_studio_task',
          description: 'Create a studio task after the user clearly asks to add one.',
          parameters: {
            type: 'OBJECT',
            properties: {
              title: { type: 'STRING', description: 'A concise task title, up to 160 characters.' },
              description: { type: 'STRING', description: 'Optional task details, up to 1000 characters.' },
              due_at: { type: 'STRING', description: 'Optional ISO 8601 due date and time.' },
            },
            required: ['title'],
          },
        },
      ],
    }],
  },
  tech_ops: {
    name: 'Tech Ops',
    systemInstruction: {
      parts: [{
        text: 'You are Tech Ops, VEXON Studio’s technical systems assistant. Give concise infrastructure, Supabase heartbeat, and authorized host telemetry information using only the provided health tool. Report CPU, memory, platform, and uptime only for hosts present in the tool result. The dashboard does not expose firewall telemetry or remote control; say so rather than guessing. Never claim to have repaired or changed a system.',
      }],
    },
    tools: [{
      functionDeclarations: [{
        name: 'get_system_health',
        description: 'Read the protected website heartbeat and latest authorized host telemetry.',
        parameters: { type: 'OBJECT', properties: {} },
      }],
    }],
  },
};

export const getRealtimeAssistantConfig = (persona) => {
  const assistant = REALTIME_ASSISTANTS[persona];
  if (!assistant) return null;

  return {
    responseModalities: ['AUDIO'],
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    systemInstruction: assistant.systemInstruction,
    tools: assistant.tools,
  };
};
