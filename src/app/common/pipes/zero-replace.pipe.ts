import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'zeroReplace',
  standalone: true
})
export class ZeroReplacePipe implements PipeTransform {
  transform(value: string | null, replaceWith: string = '-'): string | null {
    // Handle formatted "0", "0.0", "0.00", etc.
    if (value === null || value === undefined || value === '0' || value === '0.0' || value === '0.00') {
      return replaceWith;
    }
    return value;
  }
}
