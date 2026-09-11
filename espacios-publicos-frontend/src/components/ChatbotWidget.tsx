import { useState, useRef, useEffect, type FormEvent } from 'react';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Flex,
  Paper,
  ScrollArea,
  Text,
  TextInput,
  Transition,
  Loader,
  Group
} from '@mantine/core';
import {
  IconMessageChatbot,
  IconX,
  IconSend,
  IconSparkles,
  IconCalendarEvent
} from '@tabler/icons-react';
import { askChatbot, type ChatMessage } from '../lib/api';

interface DisplayMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  time: string;
}

const QUICK_PROMPTS = [
  '¿Qué eventos hay disponibles?',
  '¿Hay actividades con entrada libre?',
  '¿Qué eventos de música o teatro hay?'
];

export default function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: '¡Hola! Soy el asistente de CityPass+. Preguntame sobre eventos culturales, fechas, ubicaciones o cupos en la ciudad.',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);

  const viewportRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({
        top: viewportRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const messageCounterRef = useRef(0);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || loading) return;

    messageCounterRef.current += 1;
    const userDisplayMsg: DisplayMessage = {
      id: `user-${messageCounterRef.current}`,
      sender: 'user',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userDisplayMsg]);
    setInputMessage('');
    setLoading(true);

    try {
      const response = await askChatbot(text, conversationHistory);
      const botReply = response.reply;

      messageCounterRef.current += 1;
      const botDisplayMsg: DisplayMessage = {
        id: `bot-${messageCounterRef.current}`,
        sender: 'bot',
        text: botReply,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages((prev) => [...prev, botDisplayMsg]);

      // Mantener historial limitado (últimas 3 rondas = 6 mensajes)
      setConversationHistory((prev) => {
        const next = [
          ...prev,
          { role: 'user' as const, content: text },
          { role: 'model' as const, content: botReply }
        ];
        return next.slice(-6);
      });
    } catch (err: unknown) {
      messageCounterRef.current += 1;
      const errorText =
        err instanceof Error
          ? err.message
          : 'Ocurrió un error al contactar al asistente. Por favor, intentá nuevamente en unos instantes.';
      const errorDisplayMsg: DisplayMessage = {
        id: `bot-err-${messageCounterRef.current}`,
        sender: 'bot',
        text: errorText,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, errorDisplayMsg]);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    void handleSendMessage();
  };

  return (
    <Box style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
      {/* Botón flotante para abrir/cerrar */}
      <ActionIcon
        size={58}
        radius="xl"
        variant="filled"
        color="blue.7"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          boxShadow: '0 8px 24px rgba(34, 139, 230, 0.4)',
          transition: 'transform 0.2s ease',
          transform: isOpen ? 'rotate(90deg)' : 'none'
        }}
        aria-label="Abrir asistente virtual"
      >
        {isOpen ? <IconX size={28} /> : <IconMessageChatbot size={30} />}
      </ActionIcon>

      {/* Ventana de chat desplegable */}
      <Transition mounted={isOpen} transition="pop-bottom-right" duration={250} timingFunction="ease">
        {(styles) => (
          <Paper
            shadow="xl"
            radius="lg"
            withBorder
            style={{
              ...styles,
              position: 'absolute',
              bottom: 72,
              right: 0,
              width: 380,
              maxWidth: 'calc(100vw - 32px)',
              height: 520,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              backgroundColor: '#FFFFFF',
              borderColor: '#E2E8F0'
            }}
          >
            {/* Header del Asistente */}
            <Box
              p="md"
              style={{
                background: 'linear-gradient(135deg, #1C7ED6 0%, #1864AB 100%)',
                color: '#FFFFFF'
              }}
            >
              <Flex justify="space-between" align="center">
                <Flex align="center" gap="xs">
                  <Box
                    style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                      padding: 6,
                      borderRadius: 8,
                      display: 'flex'
                    }}
                  >
                    <IconSparkles size={20} color="#FFFFFF" />
                  </Box>
                  <Box>
                    <Text fw={700} size="sm" c="white">
                      Asistente de Eventos
                    </Text>
                    <Text size="xs" c="blue.1">
                      CityPass+ Cultura
                    </Text>
                  </Box>
                </Flex>
                <Group gap={6}>
                  <Badge size="sm" color="green" variant="filled">
                    En línea
                  </Badge>
                  <ActionIcon
                    size="sm"
                    variant="subtle"
                    color="white"
                    onClick={() => setIsOpen(false)}
                    aria-label="Cerrar chat"
                  >
                    <IconX size={16} />
                  </ActionIcon>
                </Group>
              </Flex>
            </Box>

            {/* Historial de Mensajes */}
            <ScrollArea flex={1} p="md" viewportRef={viewportRef}>
              <Flex direction="column" gap="xs">
                {messages.map((msg) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <Box
                      key={msg.id}
                      style={{
                        alignSelf: isUser ? 'flex-end' : 'flex-start',
                        maxWidth: '82%'
                      }}
                    >
                      <Paper
                        p="xs"
                        radius="md"
                        style={{
                          backgroundColor: isUser ? '#1C7ED6' : '#F1F3F5',
                          color: isUser ? '#FFFFFF' : '#212529',
                          borderTopRightRadius: isUser ? 2 : 12,
                          borderTopLeftRadius: isUser ? 12 : 2
                        }}
                      >
                        <Text size="sm" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                          {msg.text}
                        </Text>
                      </Paper>
                      <Text
                        size="10px"
                        c="dimmed"
                        ta={isUser ? 'right' : 'left'}
                        mt={2}
                        px={4}
                      >
                        {msg.time}
                      </Text>
                    </Box>
                  );
                })}

                {loading && (
                  <Box style={{ alignSelf: 'flex-start', maxWidth: '80%' }}>
                    <Paper
                      p="xs"
                      radius="md"
                      bg="#F1F3F5"
                      style={{ borderTopLeftRadius: 2 }}
                    >
                      <Flex align="center" gap="xs">
                        <Loader size={14} color="blue" />
                        <Text size="xs" c="dimmed">
                          Consultando agenda...
                        </Text>
                      </Flex>
                    </Paper>
                  </Box>
                )}
              </Flex>
            </ScrollArea>

            {/* Chips de sugerencias rápidas */}
            {messages.length <= 2 && (
              <Box px="md" pb="xs">
                <Text size="xs" c="dimmed" mb={6} fw={500}>
                  Preguntas sugeridas:
                </Text>
                <Flex wrap="wrap" gap={6}>
                  {QUICK_PROMPTS.map((prompt) => (
                    <Button
                      key={prompt}
                      size="compact-xs"
                      variant="light"
                      color="blue"
                      radius="xl"
                      leftSection={<IconCalendarEvent size={12} />}
                      onClick={() => void handleSendMessage(prompt)}
                    >
                      {prompt}
                    </Button>
                  ))}
                </Flex>
              </Box>
            )}

            {/* Input y botón de envío */}
            <Box
              p="sm"
              component="form"
              onSubmit={onSubmit}
              style={{
                borderTop: '1px solid #E2E8F0',
                backgroundColor: '#F8F9FA'
              }}
            >
              <TextInput
                placeholder="Preguntá sobre eventos..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.currentTarget.value)}
                maxLength={300}
                disabled={loading}
                rightSection={
                  <ActionIcon
                    type="submit"
                    color="blue"
                    variant="filled"
                    radius="md"
                    disabled={!inputMessage.trim() || loading}
                    aria-label="Enviar mensaje"
                  >
                    <IconSend size={16} />
                  </ActionIcon>
                }
              />
            </Box>
          </Paper>
        )}
      </Transition>
    </Box>
  );
}
