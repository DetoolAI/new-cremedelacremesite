import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

import { EmailLogo } from './_logo'
const SITE_NAME = 'Crème de la Crème Nails ®'

interface Props {
  firstName?: string
  magicLink?: string
}

const MemberMagicLink = ({ firstName = '', magicLink = '#' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Crème Society sign-in link is ready</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailLogo />
        <Text style={brandLabel}>CRÈME SOCIETY · MEMBER SIGN-IN</Text>
        <Heading style={h1}>
          {firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}
        </Heading>
        <Text style={text}>
          Your secure sign-in link is ready. Tap the button below and you'll be
          taken straight to your member booking page — no password required.
        </Text>
        <Section style={btnWrap}>
          <Button href={magicLink} style={button}>
            Sign In to My Membership
          </Button>
        </Section>
        <Text style={smallText}>
          Or copy &amp; paste this link into your browser:
        </Text>
        <Text style={linkText}>{magicLink}</Text>
        <Hr style={hr} />
        <Text style={fineprint}>
          For your security, this link expires in <strong>1 hour</strong> and can
          only be used <strong>once</strong>. If you didn't request this, you can
          safely ignore this email.
        </Text>
        <Text style={footer}>
          With love,<br />
          The {SITE_NAME} Team
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: MemberMagicLink,
  subject: 'Your Crème Society sign-in link',
  displayName: 'Member magic link',
  previewData: {
    firstName: 'Jane',
    magicLink: 'https://cremedelacremenails.com/member-book?token=example',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brandLabel = { fontSize: '11px', letterSpacing: '0.22em', color: '#b08d57', margin: '0 0 24px' }
const h1 = { fontSize: '26px', color: '#1a1a1a', margin: '0 0 18px' }
const text = { fontSize: '15px', color: '#444', lineHeight: '1.6', margin: '0 0 22px' }
const btnWrap = { textAlign: 'center' as const, margin: '28px 0' }
const button = {
  backgroundColor: '#c1574e',
  color: '#ffffff',
  padding: '14px 28px',
  textDecoration: 'none',
  fontSize: '13px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase' as const,
  display: 'inline-block',
}
const smallText = { fontSize: '12px', color: '#777', margin: '20px 0 6px' }
const linkText = { fontSize: '12px', color: '#b08d57', wordBreak: 'break-all' as const, margin: '0 0 14px' }
const hr = { borderColor: '#eee', margin: '24px 0' }
const fineprint = { fontSize: '12px', color: '#777', lineHeight: '1.5', margin: '0 0 18px' }
const footer = { fontSize: '13px', color: '#555', margin: '24px 0 0', lineHeight: '1.6' }
