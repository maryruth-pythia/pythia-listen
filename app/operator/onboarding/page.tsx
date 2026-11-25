import { PythiaMark } from '@/components/GradientHeader';
import OnboardingWizard from '@/components/operator/OnboardingWizard';

export const metadata = { title: 'Get set up · Pythia' };

const GRAD = 'linear-gradient(90deg,#FCC029 0%,#EC2BFC 52%,#6A0FC2 100%)';

export default function OnboardingPage() {
  return (
    <div className="-mx-6 -my-8 min-h-screen" style={{ background: '#F7F5FB' }}>
      <header className="text-white" style={{ background: GRAD, minHeight: 132 }}>
        <div className="px-6 py-8">
          <div className="mb-3 flex items-center gap-3">
            <PythiaMark />
            <span className="font-serif text-[22px]" style={{ color: '#FCF6C4' }}>Pythia</span>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: 'rgba(255,255,255,.85)' }}>
            Get set up
          </span>
          <h1 className="mt-2 font-serif text-3xl font-semibold">
            Let&rsquo;s get your first project running
          </h1>
          <p className="mt-2 max-w-2xl text-[13.5px]" style={{ color: 'rgba(255,255,255,.9)' }}>
            A few quick steps: set up your organization, create a project to track, add your
            community&rsquo;s input, and watch your dashboard fill in. You can add more projects
            anytime.
          </p>
        </div>
      </header>

      <div className="px-6 py-8">
        <OnboardingWizard />
      </div>
    </div>
  );
}
