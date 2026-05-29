import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

import { EmailLogo } from './_logo'
const SITE_NAME = 'Crème de la Crème Nails ®'

interface Props {
  signupEmail?: string
  signupTime?: string
  userId?: string
}

const AccountSignup = ({ signupEmail = '', signupTime, userId }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New account signup: {signupEmail}</Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailLogo />
        <Text style={brandLabel}>CRÈME DE LA CRÈME · ADMIN</Text>
        <Heading style={h1}>New account created</Heading>
        <Text style={text}>Someone just created a new account on your website.</Text>
        <Text style={detail}><strong>Email:</strong> {signupEmail}</Text>
        {signupTime && <Text style={detail}><strong>Signed up:</strong> {signupTime}</Text>}
        {userId && <Text style={detail}><strong>User ID:</strong> {userId}</Text>}
        <Text style={footer}>
          You can manage users in your admin dashboard. — {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: AccountSignup,
  subject: (data: Record<string, any>) => `New account signup: ${data.signupEmail ?? ''}`,
  displayName: 'Account signup (admin)',
  previewData: { signupEmail: 'jane@example.com', signupTime: new Date().toISOString(), userId: 'abc-123' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brandLabel = { fontSize: '11px', letterSpacing: '0.22em', color: '#b08d57', margin: '0 0 24px' }
const h1 = { fontSize: '24px', color: '#1a1a1a', margin: '0 0 18px' }
const text = { fontSize: '14px', color: '#444', lineHeight: '1.6', margin: '0 0 14px' }
const detail = { fontSize: '14px', color: '#222', margin: '0 0 8px' }
const footer = { fontSize: '12px', color: '#999', margin: '28px 0 0' }
