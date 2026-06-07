import { redirect } from 'next/navigation';

export default function OnboardingPage() {
  // Directly redirect to the first step of the wizard
  redirect('/onboarding/create-org');
}
