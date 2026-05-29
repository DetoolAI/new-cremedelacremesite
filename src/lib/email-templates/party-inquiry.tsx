import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

import { EmailLogo } from './_logo'
const SITE_NAME = 'Crème de la Crème Nails ®'

interface Props {
  isAdmin?: boolean
  customerName?: string
  customerEmail?: string
  customerPhone?: string
  eventType?: string
  location?: string
  groupSize?: string
  services?: string
  dateRange?: string
  message?: string
}

const PartyInquiry = ({
  isAdmin,
  customerName = '',
  customerEmail = '',
  customerPhone = '',
  eventType = '',
  location = '',
  groupSize = '',
  services = '',
  dateRange = '',
  message,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {isAdmin
        ? `New ${eventType} inquiry from ${customerName}`
        : `We received your ${eventType} inquiry — ${SITE_NAME}`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailLogo />
        <Text style={brandLabel}>CRÈME DE LA CRÈME · GROUPS &amp; PARTIES</Text>

        {isAdmin ? (
          <>
            <Heading style={h1}>New {eventType} inquiry</Heading>
            <Text style={text}>
              A new party / event inquiry was just submitted from your website.
            </Text>

            <Text style={sectionLabel}>CLIENT</Text>
            <Text style={detail}><strong>Name:</strong> {customerName}</Text>
            <Text style={detail}><strong>Email:</strong> {customerEmail}</Text>
            <Text style={detail}><strong>Phone:</strong> {customerPhone}</Text>

            <Text style={sectionLabel}>EVENT DETAILS</Text>
            <Text style={detail}><strong>Event:</strong> {eventType}</Text>
            <Text style={detail}><strong>Location:</strong> {location}</Text>
            <Text style={detail}><strong>Group size:</strong> {groupSize}</Text>
            <Text style={detail}><strong>Preferred date(s):</strong> {dateRange}</Text>
            <Text style={detail}><strong>Services requested:</strong> {services}</Text>
            {message && (
              <>
                <Text style={sectionLabel}>NOTES</Text>
                <Text style={detail}>{message}</Text>
              </>
            )}

            <Text style={footer}>Reply directly to {customerEmail} to follow up.</Text>
          </>
        ) : (
          <>
            <Heading style={h1}>Thank you for your inquiry ✦</Heading>
            <Text style={text}>
              Hi {customerName || 'there'}, we received your {eventType.toLowerCase()} inquiry and
              Angie will personally follow up shortly to plan it with you.
            </Text>

            <Text style={sectionLabel}>YOUR INQUIRY</Text>
            <Text style={detail}><strong>Event:</strong> {eventType}</Text>
            <Text style={detail}><strong>Location:</strong> {location}</Text>
            <Text style={detail}><strong>Group size:</strong> {groupSize}</Text>
            <Text style={detail}><strong>Preferred date(s):</strong> {dateRange}</Text>
            <Text style={detail}><strong>Services:</strong> {services}</Text>

            <Text style={text}>
              If you need to reach us sooner, you can call <strong>(347) 880-8282</strong> or email{' '}
              <strong>angie@cremedelacremenails.com</strong>.
            </Text>
            <Text style={footer}>— Angie &amp; the {SITE_NAME} team</Text>
          </>
        )}
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: PartyInquiry,
  subject: (data: Record<string, any>) =>
    data.isAdmin
      ? `New ${data.eventType ?? 'party'} inquiry — ${data.customerName ?? ''}`
      : `We received your inquiry — ${SITE_NAME}`,
  displayName: 'Party / Bridal inquiry',
  previewData: {
    isAdmin: false,
    customerName: 'Jane Doe',
    customerEmail: 'jane@example.com',
    customerPhone: '347-555-0100',
    eventType: 'Bridal Party',
    location: 'Mobile / On-Location',
    groupSize: '6 people',
    services: 'Gel manicures + regular pedicures, nail art for the bride',
    dateRange: 'Saturday, June 14',
    message: 'Bride and 5 bridesmaids. Champagne, please!',
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
