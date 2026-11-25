import { redirect } from 'next/navigation';

// Operator home lands on the dashboard (the main working view). The former
// projects/sessions overview lives on in the Listening tool.
export default function OperatorHome() {
  redirect('/operator/dashboard');
}
