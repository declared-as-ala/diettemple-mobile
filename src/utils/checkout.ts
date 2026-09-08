export interface CheckoutFields { fullName: string; street: string; email: string; phone: string }
export function validateCheckout(form: CheckoutFields): Partial<CheckoutFields> {
  const errors: Partial<CheckoutFields> = {};
  if (!form.fullName.trim()) errors.fullName = 'Indiquez votre nom complet.';
  if (!form.street.trim()) errors.street = 'Indiquez votre adresse complète, avec la ville.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Indiquez une adresse e-mail valide.';
  if (!/^(\+216|00216)?[0-9]{8}$/.test(form.phone.replace(/[\s().-]/g, ''))) errors.phone = 'Indiquez un numéro tunisien de 8 chiffres, avec ou sans +216.';
  return errors;
}
