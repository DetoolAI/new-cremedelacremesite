import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

import { EmailLogo } from './_logo'
const SITE_NAME = 'Crème de la Crème Nails ®'

interface Props {
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  service?: string
  notes?: string
  timestamp?: string
}

const ContactInquiry = ({
  customerName = '',
  customerEmail = '',
  customerPhone = '',
  service = '',
  notes,
  timestamp = '',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`New appointment request — ${customerName}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailLogo />
        <Text style={brandLabel}>CRÈME DE LA CRÈME · APPOINTMENT REQUEST</Text>

        <Heading style={h1}>New appointment request</Heading>
        <Text style={text}>
          A new appointment request was just submitted from your website.
        </Text>

        <Text style={sectionLabel}>CLIENT</Text>
        <Text style={detail}><strong>Name:</strong> {customerName}</Text>
        <Text style={detail}><strong>Email:</strong> {customerEmail}</Text>
        <Text style={detail}><strong>Phone:</strong> {customerPhone}</Text>

        <Text style={sectionLabel}>REQUEST</Text>
        <Text style={detail}><strong>Service:</strong> {service}</Text>
        {notes && (
          <>
            <Text style={sectionLabel}>NOTES</Text>
            <Text style={detail}>{notes}</Text>
          </>
        )}

        {timestamp && <Text style={footer}>Submitted: {timestamp}</Text>}
        <Text style={footer}>Reply directly to {customerEmail} to follow up.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactInquiry,
  subject: (data: Record<string, any>) =>
    `New appointment request — ${data.customerName ?? ''}`,
  displayName: 'Contact / appointment request',
  previewData: {
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    customerPhone: '347-555-0100',
    service: 'Gel Manicure',
    notes: 'Prefer Saturday morning if possible.',
    timestamp: new Date().toLocaleString(),
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, serif' }
const container = { padding: '40px 30px', maxWidth: '560px' }
const brandLabel = { fontSize: '11px', letterSpacing: '0.25em', color: '#b8945f', margin: '0 0 24px', fontFamily: 'Arial, sans-serif' }
const h1 = { fontSize: '28px', fontWeight: 'normal', color: '#1a1a1a', margin: '0 0 20px', lineHeight: '1.2' }
const text = { fontSize: '15px', color: '#444', lineHeight: '1.6', margin: '0 0 16px' }
const sectionLabel = { fontSize: '11px', letterSpacing: '0.2em', color: '#b8945f', margin: '24px 0 8px', fontFamily: 'Arial, sans-serif' }
const detail = { fontSize: '15px', color: '#1a1a1a', lineHeight: '1.6', margin: '0 0 6px' }
const footer = { fontSize: '13px', color: '#888', margin: '28px 0 0', fontStyle: 'italic' }
