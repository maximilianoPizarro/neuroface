import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-labels',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatListModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <h2>Known Labels</h2>

    <mat-card>
      <mat-card-content>
        <mat-spinner *ngIf="loading" diameter="32"></mat-spinner>

        <p *ngIf="!loading && labels.length === 0" class="empty-msg">
          No labels found. Upload training images first.
        </p>

        <mat-list *ngIf="labels.length > 0">
          <mat-list-item *ngFor="let label of labels">
            <mat-icon matListItemIcon>person</mat-icon>
            <span matListItemTitle>{{ label }}</span>
            <span matListItemMeta>
              <button mat-icon-button color="warn" (click)="deleteLabel(label)" [attr.aria-label]="'Delete ' + label">
                <mat-icon>delete</mat-icon>
              </button>
            </span>
          </mat-list-item>
        </mat-list>
      </mat-card-content>
      <mat-card-actions>
        <button mat-button (click)="refresh()">
          <mat-icon>refresh</mat-icon> Refresh
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .empty-msg { color: #999; font-style: italic; }
  `],
})
export class LabelsComponent implements OnInit {
  labels: string[] = [];
  loading = true;

  constructor(private api: ApiService, private snackBar: MatSnackBar) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh(): void {
    this.loading = true;
    this.api.getLabels().subscribe({
      next: (res) => {
        this.labels = res.labels;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to load labels', 'OK', { duration: 3000 });
      },
    });
  }

  deleteLabel(label: string): void {
    if (!confirm(`Delete all images for "${label}"?`)) return;
    this.api.deleteImages(label).subscribe({
      next: (res) => {
        this.snackBar.open(`Deleted ${res.deleted} images for "${label}"`, 'OK', { duration: 3000 });
        this.refresh();
      },
      error: (err) => {
        this.snackBar.open(`Error: ${err.error?.detail || err.message}`, 'OK', { duration: 3000 });
      },
    });
  }
}
