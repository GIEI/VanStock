import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

/** Converts a relative /uploads/... path to an absolute URL using the backend origin. */
@Pipe({ name: 'photoUrl', standalone: true })
export class PhotoUrlPipe implements PipeTransform {
  private readonly base = environment.backendUrl ?? '';

  transform(url: string | null | undefined): string {
    if (!url) return '';
    return url.startsWith('/') ? this.base + url : url;
  }
}
