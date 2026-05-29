import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'
import { EmailLogo } from './_logo'

const SITE_NAME = 'Crème de la Crème Nails ®'

interface Props {
  customerName?: string
  tierName?: string
  remainingList?: string
  bookingUrl?: string
  membershipCardUrl?: string
  hasUnused?: boolean
}

const MemberMidMonth = ({
  customerName = 'there',
  tierName = 'Membership',
  remainingList = '',
  bookingUrl,
  membershipCardUrl,
  hasUnused = true,
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {hasUnused
        ? 'Your membership benefits — what you have left this month'
        : 'You\'ve used all your benefits this month — see you next month'}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailLogo />
        <Text style={brandLabel}>CRÈME DE LA CRÈME · THE NAILS CLUB</Text>
        <Heading style={h1}>
          {hasUnused ? `A quick reminder, ${customerName}.` : `Thanks for visiting, ${customerName}.`}
        </Heading>
        <Text style={text}>
          {hasUnused ? (
            <>Here's what's still left on your <strong>{tierName}</strong> membership this month.
            Benefits don't roll over — they reset on the 1st.</>
          ) : (
            <>You've already used everything on your <strong>{tierName}</strong> membership this month.
            Your benefits refresh on the 1st of next month.</>
          )}
        </Text>

        {hasUnused && remainingList && (
          <>
            <Heading as="h2" style={h2}>Remaining this month</Heading>
            <Section style={card}>
              <Text style={{ ...rowValue, whiteSpace: 'pre-line' as const }}>{remainingList}</Text>
            </Section>

            {bookingUrl && (
              <Section style={ctaWrap}>
                <a href={bookingUrl} style={ctaButton}>Book before the month ends</a>
              </Section>
            )}
          </>
        )}

        {membershipCardUrl && (
          <Text style={text}>
            <a href={membershipCardUrl} style={{ color: '#7a1f0e' }}>Open my membership card</a>.
          </Text>
        )}

        <Text style={text}>
          Questions? Reply to this email, or call{' '}
          <a href="tel:+13478808282" style={{ color: '#7a1f0e' }}><strong>(347) 880-8282</strong></a>.
        </Text>

        <Hr style={hr} />
        <Text style={footer}>{SITE_NAME} · 4413 Broadway 189ST, New York, NY 10040</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: MemberMidMonth,
  subject: (data: Record<string, any>) =>
    data?.hasUnused === false
      ? `You're all caught up this month at ${SITE_NAME}`
      : `Your remaining services this month at ${SITE_NAME}`,
  displayName: 'Member — mid-month balance',
  previewData: {
    customerName: 'Jane',
    tierName: 'Gel Mani & Gel Pedi',
    remainingList: '• 1 of 2 Gel Manicure + Gel Soak\n• 1 of 1 Gel Pedicure + Gel Soak',
    hasUnused: true,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const brandLabel = { fontSize: '10px', letterSpacing: '0.28em', color: '#a07c4d', margin: '0 0 18px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#1f1410', margin: '0 0 18px', lineHeight: '1.25' }
const h2 = { fontSize: '13px', fontWeight: 'bold' as const, color: '#1f1410', margin: '24px 0 8px', letterSpacing: '0.1em', textTransform: 'uppercase' as const }
const text = { fontSize: '14px', color: '#55454a', lineHeight: '1.6', margin: '0 0 18px' }
const card = { backgroundColor: '#fbf6f0', border: '1px solid #f0e7df', borderRadius: '4px', padding: '14px 18px', margin: '8px 0 18px' }
const rowValue = { fontSize: '14px', color: '#1f1410', margin: '0', fontWeight: 500 as const }
const hr = { border: 'none', borderTop: '1px solid #f0e7df', margin: '28px 0 14px' }
const footer = { fontSize: '11px', color: '#a8a0a3', textAlign: 'center' as const, margin: '0' }
const ctaWrap = { textAlign: 'center' as const, margin: '8px 0 22px' }
const ctaButton = {
  display: 'inline-block',
  backgroundColor: '#7a1f0e',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 'bold' as const,
  letterSpacing: '0.12em',
  textTransform: 'uppercase' as const,
  padding: '12px 24px',
  borderRadius: '4px',
  textDecoration: 'none',
}
