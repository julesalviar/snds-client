import { AbstractControl, FormGroup } from '@angular/forms';

export function controlHasErrorAndTouched(form: FormGroup, controlName: string, errorName: string): boolean {
  const control: AbstractControl | null = form.get(controlName);
  return !!control?.hasError(errorName) && (control?.touched || control?.dirty);
}
