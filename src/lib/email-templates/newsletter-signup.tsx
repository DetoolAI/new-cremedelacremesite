import { Body, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

import { EmailLogo } from './_logo'
const SITE_NAME = 'Crème de la Crème Nails ®'

interface Props {
  signupEmail?: string
  signupPhone?: string
  signupName?: string
  isAdmin?: boolean
}

const NewsletterSignup = ({ signupEmail = '', signupPhone, signupName, isAdmin }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>
      {isAdmin ? `New Nails Club signup: ${signupEmail}` : `Welcome to the Nails Club at ${SITE_NAME}`}
    </Preview>
    <Body style={main}>
      <Container style={container}>
        <EmailLogo />
        <Text style={brandLabel}>CRÈME DE LA CRÈME · NAILS CLUB</Text>

        {isAdmin ? (
          <>
            <Heading style={h1}>New Nails Club signup</Heading>
            <Text style={text}>Someone just joined the Nails Club from your website.</Text>
            <Text style={detail}><strong>Email:</strong> {signupEmail}</Text>
            {signupPhone && <Text style={detail}><strong>Phone:</strong> {signupPhone}</Text>}
            {signupName && <Text style={detail}><strong>Name:</strong> {signupName}</Text>}
            <Text style={footer}>You can view all signups in your admin dashboard under History → Newsletter.</Text>
          </>
        ) : (
          <>
            <Heading style={h1}>Welcome to the Nails Club ✦</Heading>
            <Text style={text}>
              Thanks for signing up! You'll be the first to hear about exclusive offers, coupons,
              new services, and special promotions from {SITE_NAME}.
            </Text>
            <Text style={text}>
              We can't wait to pamper you. See you at the salon soon.
            </Text>
            <Text style={footer}>— Angie & the Crème de la Crème Nails ® team</Text>
          </>
        )}
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: NewsletterSignup,
  subject: (data: Record<string, any>) =>
    data.isAdmin
      ? `New Nails Club signup: ${data.signupEmail ?? ''}`
      : `Welcome to the Nails Club at ${SITE_NAME}`,
  displayName: 'Newsletter (Nails Club) signup',
  previewData: { signupEmail: 'jane@example.com', signupPhone: '555-1234', isAdmin: false },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Georgia, serif' }
const container = { padding: '40px 30px', maxWidth: '560px' }
const brandLabel = { fontSize: '11px', letterSpacing: '0.25em', color: '#b8945f', margin: '0 0 24px', fontFamily: 'Arial, sans-serif' }
const h1 = { fontSize: '28px', fontWeight: 'normal', color: '#1a1a1a', margin: '0 0 20px', lineHeight: '1.2' }
const text = { fontSize: '15px', color: '#444', lineHeight: '1.6', margin: '0 0 16px' }
const detail = { fontSize: '15px', color: '#1a1a1a', lineHeight: '1.6', margin: '0 0 8px' }
const footer = { fontSize: '13px', color: '#888', margin: '28px 0 0', fontStyle: 'italic' }
