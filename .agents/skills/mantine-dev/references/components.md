# Components Reference

`@mantine/core` provides 120+ components. This reference covers key patterns.

## Layout Components

### Container, Stack, Group, Flex

```tsx
import { Container, Stack, Group, Flex } from '@mantine/core';

<Container size="md">{/* Centers content, max-width */}</Container>

<Stack gap="md">{/* Vertical flex */}</Stack>

<Group gap="sm" justify="space-between">{/* Horizontal flex */}</Group>

<Flex direction="column" gap="md" align="center">{/* Generic flex */}</Flex>
```

### Grid & SimpleGrid

```tsx
import { Grid, SimpleGrid } from '@mantine/core';

// CSS Grid with responsive spans
<Grid>
  <Grid.Col span={{ base: 12, sm: 6, lg: 4 }}>Responsive</Grid.Col>
</Grid>

// Equal-width columns
<SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>{/* Items */}</SimpleGrid>
```

## Button Variants

```tsx
import { Button, ActionIcon } from '@mantine/core';

<Button variant="filled">Default</Button>
<Button variant="outline">Outline</Button>
<Button variant="light">Light</Button>
<Button variant="subtle">Subtle</Button>
<Button variant="white">White</Button>

<Button loading>Loading state</Button>
<Button leftSection={<IconPlus />}>With Icon</Button>

// Icon button
<ActionIcon variant="filled" color="blue"><IconSettings /></ActionIcon>
```

## Inputs Pattern

All inputs follow consistent API:

```tsx
import { TextInput, PasswordInput, Textarea, NumberInput, Select } from '@mantine/core';

// Common props: label, description, error, required, placeholder
<TextInput
  label="Email"
  description="We won't share it"
  error="Invalid email"
  required
  withAsterisk
/>

<Select
  label="Country"
  data={['USA', 'Canada']}
  searchable
  clearable
/>

// Objects with value/label
<Select data={[{ value: 'us', label: 'United States' }]} />
```

## Overlays Pattern

Modals, Drawers, Menus, Popovers all use similar pattern:

```tsx
import { Modal, Drawer, Menu, Popover } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

// Common pattern with useDisclosure
const [opened, { open, close }] = useDisclosure(false);

// Modal
<Modal opened={opened} onClose={close} title="Title">Content</Modal>

// Drawer
<Drawer opened={opened} onClose={close} position="left">Navigation</Drawer>

// Menu (dropdown)
<Menu>
  <Menu.Target><Button>Toggle</Button></Menu.Target>
  <Menu.Dropdown>
    <Menu.Item leftSection={<IconSettings />}>Settings</Menu.Item>
    <Menu.Divider />
    <Menu.Item color="red">Delete</Menu.Item>
  </Menu.Dropdown>
</Menu>

// Popover
<Popover width={200} withArrow>
  <Popover.Target><Button>Info</Button></Popover.Target>
  <Popover.Dropdown>Details here</Popover.Dropdown>
</Popover>
```

## Feedback Components

```tsx
import { Loader, Alert, Notification, Progress, Skeleton } from '@mantine/core';

<Loader type="bars" />  // oval, bars, dots

<Alert variant="light" color="blue" title="Info">Message</Alert>

<Notification title="Success" color="green" icon={<IconCheck />}>
  Saved!
</Notification>

<Progress value={65} />
<Progress.Root size="xl">
  <Progress.Section value={35} color="cyan"><Progress.Label>Docs</Progress.Label></Progress.Section>
</Progress.Root>

// Loading placeholders
<Skeleton height={50} circle />
<Skeleton height={8} radius="xl" />
```

## Typography

```tsx
import { Title, Text, Anchor, Highlight, Code } from '@mantine/core';

<Title order={1}>h1 heading</Title>
<Title order={2} c="dimmed">h2 dimmed</Title>

<Text size="sm" c="dimmed" fw={700}>Small bold dimmed</Text>
<Text truncate>Long text...</Text>
<Text lineClamp={2}>Multi-line truncate...</Text>

<Highlight highlight={['react', 'mantine']}>
  Learn React with Mantine
</Highlight>

<Code>inline</Code>
<Code block>{`const x = 1;`}</Code>
```

## Data Display

```tsx
import { Badge, Card, Table, Avatar, Image, Tabs, Accordion } from '@mantine/core';

// Badge variants
<Badge>Default</Badge>
<Badge variant="dot" color="red">Dot</Badge>

// Card with sections
<Card shadow="sm" padding="lg" withBorder>
  <Card.Section><Image src="/img.jpg" height={160} /></Card.Section>
  <Text>Content</Text>
</Card>

// Table
<Table striped highlightOnHover withTableBorder>
  <Table.Thead><Table.Tr><Table.Th>Name</Table.Th></Table.Tr></Table.Thead>
  <Table.Tbody><Table.Tr><Table.Td>John</Table.Td></Table.Tr></Table.Tbody>
</Table>

// Tabs
<Tabs defaultValue="tab1">
  <Tabs.List>
    <Tabs.Tab value="tab1">First</Tabs.Tab>
    <Tabs.Tab value="tab2">Second</Tabs.Tab>
  </Tabs.List>
  <Tabs.Panel value="tab1">Content 1</Tabs.Panel>
</Tabs>

// Accordion
<Accordion defaultValue="item-1">
  <Accordion.Item value="item-1">
    <Accordion.Control>Section 1</Accordion.Control>
    <Accordion.Panel>Content</Accordion.Panel>
  </Accordion.Item>
</Accordion>
```

## Navigation

```tsx
import { NavLink, Pagination, Stepper, Breadcrumbs } from '@mantine/core';

<NavLink href="#" label="Dashboard" leftSection={<IconHome />} active />
<NavLink label="Settings">
  <NavLink label="General" />
  <NavLink label="Security" />
</NavLink>

<Pagination total={10} value={page} onChange={setPage} />

<Stepper active={active}>
  <Stepper.Step label="Step 1">Content 1</Stepper.Step>
  <Stepper.Step label="Step 2">Content 2</Stepper.Step>
  <Stepper.Completed>Done!</Stepper.Completed>
</Stepper>
```

## Common Style Props

All components accept these props:

```tsx
<Component
  // Margin & Padding
  m='md'
  mt='xs'
  p='sm'
  px='md'
  // Colors
  c='dimmed'
  bg='blue.1'
  // Typography
  fw={500}
  fz='sm'
  // Dimensions
  w={200}
  h='100%'
  maw={500}
  // Responsive
  p={{ base: 'xs', sm: 'md', lg: 'xl' }}
/>
```

## Polymorphic Components

Render as different elements:

```tsx
import { Button } from '@mantine/core';
import { Link } from 'react-router-dom';

<Button component={Link} to="/about">Link Button</Button>
<Button component="a" href="https://example.com">Anchor Button</Button>
```

## Visibility Props

```tsx
<Text hiddenFrom="sm">Hidden on sm+</Text>
<Text visibleFrom="md">Visible on md+</Text>
<Text lightHidden>Only in dark mode</Text>
<Text darkHidden>Only in light mode</Text>
```
