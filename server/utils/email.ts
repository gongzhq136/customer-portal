import { Resend } from 'resend'
import fs from 'node:fs'
import path from 'node:path'

// Define the structure for the parameters used in the template
interface EmailParams {
  greeting?: string
  body_text: string
  action_url: string
  action_text: string
  footer_text: string
}

// Define the arguments for the sendEmail function
interface SendEmailArgs {
  to: string
  subject: string
  params: EmailParams
}

const RESEND_API_KEY = process.env.RESEND_API_KEY

const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL

if (!RESEND_API_KEY) {
  console.warn(
    'RESEND_API_KEY environment variable is not set. Email sending will be disabled.',
  )
}
// Update warning message to check for RESEND_FROM_EMAIL
if (!RESEND_FROM_EMAIL) {
  console.warn(
    'RESEND_FROM_EMAIL environment variable is not set. Email sending may fail.',
  )
}

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

// Path to the email template
const templatePath = path.join(process.cwd(), 'server', 'utils', 'email-template.html')
let emailTemplate = ''
try {
  emailTemplate = fs.readFileSync(templatePath, 'utf-8')
} catch (error) {
  console.error(`Error reading email template at ${templatePath}:`, error)
  // If template fails to load, email sending will likely fail later
}

// Updated sendEmail function using the template
export const sendEmail = async ({ to, subject, params }: SendEmailArgs) => {
  // Check for RESEND_FROM_EMAIL
  if (!resend || !RESEND_FROM_EMAIL || !emailTemplate) {
    console.error(
      'Email prerequisites not met (Resend key/instance, RESEND_FROM_EMAIL, or template loaded). Skipping email send.',
    )
    return Promise.resolve() // Resolve promise even if email not sent to avoid breaking auth flow
  }

  // Populate the template
  let htmlContent = emailTemplate
  const currentYear = new Date().getFullYear()
  const replacements = {
    subject: subject,
    greeting: params.greeting || 'Hello,', // Default greeting
    body_text: params.body_text,
    action_url: params.action_url,
    action_text: params.action_text,
    footer_text: params.footer_text,
    current_year: currentYear.toString(),
  }

  // Replace placeholders
  for (const [key, value] of Object.entries(replacements)) {
    const regex = new RegExp(`{{${key}}}`, 'g')
    htmlContent = htmlContent.replace(regex, String(value)) // Ensure value is string
  }

  // Simple text version (can be improved)
  const textContent = `${params.greeting || 'Hello,'}\n\n${params.body_text}\n\nPlease visit: ${params.action_url}\n\n${params.footer_text}`

  console.log(
    `Attempting to send email via Resend to ${to} with subject: ${subject}`,
  )
  try {
    const { data, error } = await resend.emails.send({
      // Use RESEND_FROM_EMAIL as the sender
      from: RESEND_FROM_EMAIL,
      to: [to],
      subject: subject,
      html: htmlContent,
      text: textContent, // Include text version
    })

    if (error) {
      console.error(`Resend API Error sending email to ${to}:`, error)
      // Re-throw or handle error as needed by the calling function
      throw error
    }

    console.log(`Email successfully sent to ${to}, ID: ${data?.id}`)
    return data
  } catch (error) {
    console.error(`Caught error during email sending process to ${to}:`, error)
    // Re-throw the error so the calling function knows it failed
    throw error
  }
}
