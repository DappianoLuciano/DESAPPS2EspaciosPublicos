import { Badge, Box, Card, Flex, Image, Text } from '@mantine/core';
import { IconCalendarEvent, IconMapPin } from '@tabler/icons-react';
import type { CommunityEventCatalogItem } from '../lib/api';

const DEFAULT_EVENT_IMAGE =
  'https://images.unsplash.com/photo-1540039155733-d7696d4eb98b?auto=format&fit=crop&q=80';

interface EventCardProps {
  event: CommunityEventCatalogItem;
  onClick: () => void;
}

export default function EventCard({ event, onClick }: EventCardProps) {
  const eventDate = new Date(event.startDate);
  const formatDateTime = (date: string) => new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));

  const abbreviatedMonth = new Intl.DateTimeFormat('es-AR', { month: 'short' })
    .format(eventDate)
    .replace('.', '')
    .slice(0, 3)
    .toUpperCase();
  const dayOfMonth = new Intl.DateTimeFormat('es-AR', { day: '2-digit' }).format(eventDate);

  const visibleTags = event.tags.slice(0, 3);

  return (
    <Card
      shadow="sm"
      padding="lg"
      radius="md"
      withBorder
      onClick={onClick}
      style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', minHeight: 430 }}
    >
      <Card.Section style={{ position: 'relative' }}>
        <Image
          src={event.imageUrl || DEFAULT_EVENT_IMAGE}
          fallbackSrc={DEFAULT_EVENT_IMAGE}
          alt={`Imagen de ${event.title}`}
          h={190}
          fit="cover"
        />
        <Box
          bg="white"
          ta="center"
          px="sm"
          py={8}
          style={{
            position: 'absolute',
            top: 14,
            right: 14,
            width: 76,
            minHeight: 82,
            borderRadius: 8,
            boxShadow: '0 6px 18px rgba(0, 10, 36, 0.18)',
          }}
        >
          <Text c="blue.8" fw={800} fz="md" lh={1.1}>{abbreviatedMonth}</Text>
          <Text c="#000A24" fw={800} fz={36} lh={1.05}>{dayOfMonth}</Text>
        </Box>
      </Card.Section>

      <Flex gap={6} mt="md" wrap="wrap">
        <Badge variant="light" color="blue" radius="sm">
          {event.category}
        </Badge>
        {visibleTags.map((tag) => (
          <Badge key={tag} variant="outline" color="gray" radius="sm">
            #{tag}
          </Badge>
        ))}
      </Flex>

      <Text fw={700} fz="xl" mt="sm" lineClamp={2}>{event.title}</Text>
      <Text fz="sm" c="dimmed" mt="xs" lineClamp={2}>
        {event.description}
      </Text>

      <Flex direction="column" gap={6} mt="auto" pt="lg">
        <Flex align="center" gap="xs">
          <IconCalendarEvent size="1rem" color="var(--mantine-color-gray-6)" />
          <Text fz="sm" fw={600}>{formatDateTime(event.startDate)}</Text>
        </Flex>
        <Flex align="center" gap="xs">
          <IconMapPin size="1rem" color="var(--mantine-color-gray-6)" />
          <Text fz="sm" c="dimmed" lineClamp={1}>
            {event.publicSpace.name}, {event.publicSpace.zone}
          </Text>
        </Flex>
      </Flex>
    </Card>
  );
}
