import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { JobService } from '../../core/services/job.service';
import { AuthService } from '../../core/services/auth.service';
import { TranslateModule } from '@ngx-translate/core';
import { interval, Subscription, startWith, switchMap } from 'rxjs';

@Component({
  selector: 'app-job-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    TranslateModule
  ],
  template: `
    <div class="chat-container">
      <div class="messages-list" #scrollContainer>
        <div *ngFor="let msg of messages; let i = index" 
             [class.message-row]="true" 
             [class.own-message]="msg.sender_id === currentUserId">
          
          <div class="message-meta" *ngIf="shouldShowMeta(msg, i)">
            <span class="sender-name">{{ msg.sender_name }}</span>
            <span class="message-time">{{ msg.created_at | date:'HH:mm' }}</span>
          </div>

          <div class="message-bubble" [ngClass]="msg.type">
            <!-- Text Message -->
            <div *ngIf="msg.type === 'text'" class="text-content">
              {{ msg.content }}
            </div>

            <!-- Audio Message -->
            <div *ngIf="msg.type === 'audio'" class="audio-content">
              <button mat-icon-button (click)="togglePlay(msg, i)" class="play-btn">
                <mat-icon>{{ msg.playing ? 'pause' : 'play_arrow' }}</mat-icon>
              </button>
              <div class="audio-info">
                <mat-progress-bar mode="determinate" [value]="msg.progress || 0"></mat-progress-bar>
                <span class="duration" *ngIf="msg.audio_duration">{{ formatDuration(msg.audio_duration) }}</span>
              </div>
              <audio #audioPlayer [src]="getAudioUrl(msg.audio_url)" (ended)="onAudioEnded(msg)" (timeupdate)="onTimeUpdate($event, msg)"></audio>
            </div>
          </div>
        </div>

        <div *ngIf="messages.length === 0" class="no-messages">
          <mat-icon>chat_bubble_outline</mat-icon>
          <p>Nessuna nota per questo lavoro. Inizia la conversazione!</p>
        </div>
      </div>

      <!-- Footer: Input and Controls -->
      <div class="chat-footer">
        <div class="input-row">
          <mat-form-field appearance="outline" class="text-input">
            <input matInput 
                   [(ngModel)]="newMessage" 
                   (keyup.enter)="sendText()" 
                   placeholder="Scrivi un messaggio..."
                   [disabled]="isRecording">
          </mat-form-field>

          <button mat-fab color="primary" *ngIf="newMessage.trim() && !isRecording" (click)="sendText()" class="send-btn">
            <mat-icon>send</mat-icon>
          </button>

          <!-- Voice Record Button -->
          <div class="record-container" *ngIf="!newMessage.trim()">
            <button mat-fab 
                    [color]="isRecording ? 'warn' : 'accent'" 
                    (mousedown)="startRecording()" 
                    (mouseup)="stopRecording()"
                    (touchstart)="startRecording()"
                    (touchend)="stopRecording()"
                    class="record-btn"
                    [matTooltip]="isRecording ? 'Rilascia per inviare' : 'Tieni premuto per registrare'">
              <mat-icon>{{ isRecording ? 'mic' : 'mic_none' }}</mat-icon>
            </button>
            <div class="recording-indicator" *ngIf="isRecording">
              <span class="dot"></span>
              <span>{{ formatDuration(recordingDuration) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .chat-container {
      display: flex;
      flex-direction: column;
      height: 600px;
      max-height: 70vh;
      background: #fdfdfd;
      border-radius: 8px;
      box-shadow: inset 0 0 10px rgba(0,0,0,0.02);
    }
    .messages-list {
      flex: 1;
      overflow-y: auto;
      padding: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .message-row {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      max-width: 80%;
    }
    .message-row.own-message {
      align-self: flex-end;
      align-items: flex-end;
    }
    .message-meta {
      font-size: 0.75rem;
      color: #888;
      margin-bottom: 2px;
      margin-left: 4px;
    }
    .own-message .message-meta {
      margin-left: 0;
      margin-right: 4px;
    }
    .sender-name {
      font-weight: 600;
      margin-right: 8px;
    }
    .message-bubble {
      padding: 10px 14px;
      border-radius: 18px;
      position: relative;
      font-size: 0.95rem;
      line-height: 1.4;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    .message-bubble.text {
      background: #fff;
      border: 1px solid #eee;
      border-bottom-left-radius: 4px;
    }
    .own-message .message-bubble.text {
      background: #e3f2fd;
      border-color: #bbdefb;
      border-bottom-left-radius: 18px;
      border-bottom-right-radius: 4px;
    }
    .message-bubble.audio {
      background: #f5f5f5;
      min-width: 180px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .own-message .message-bubble.audio {
      background: #f1f8e9;
    }
    .audio-content {
      display: flex;
      align-items: center;
      width: 100%;
      gap: 12px;
    }
    .audio-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .duration {
      font-size: 0.7rem;
      color: #666;
    }
    .no-messages {
      text-align: center;
      padding: 3rem;
      color: #bbb;
    }
    .no-messages mat-icon { font-size: 48px; width: 48px; height: 48px; margin-bottom: 1rem; }

    /* Footer Styles */
    .chat-footer {
      padding: 1rem;
      border-top: 1px solid #eee;
      background: #fff;
      border-bottom-left-radius: 8px;
      border-bottom-right-radius: 8px;
    }
    .input-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .text-input {
      flex: 1;
    }
    .text-input ::ng-deep .mat-mdc-text-field-wrapper {
        border-radius: 25px !important;
    }
    .record-container {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .recording-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f44336;
      font-weight: 500;
      animation: pulse 1.5s infinite;
    }
    .dot {
      width: 8px;
      height: 8px;
      background: #f44336;
      border-radius: 50%;
    }
    @keyframes pulse {
      0% { opacity: 1; }
      50% { opacity: 0.5; }
      100% { opacity: 1; }
    }
    @keyframes bounce {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-5px); }
    }
    .record-btn {
      transition: transform 0.2s;
    }
    .record-btn:active {
      transform: scale(1.2);
    }
    audio { display: none; }
  `]
})
export class JobChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @Input() jobId!: number;
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;
  @ViewChild('audioPlayer') private audioPlayers!: ElementRef[];

  messages: any[] = [];
  newMessage = '';
  currentUserId: number | null = null;
  
  // Recording logic
  isRecording = false;
  recordingDuration = 0;
  private mediaRecorder: any;
  private recordingInterval: any;
  private audioChunks: any[] = [];
  private recordingStartTime: number = 0;

  private pollSubscription?: Subscription;

  constructor(
    private jobService: JobService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.currentUserId = this.authService.currentUser?.id || null;
  }

  ngOnInit(): void {
    this.startPolling();
  }

  ngOnDestroy(): void {
    if (this.pollSubscription) this.pollSubscription.unsubscribe();
    if (this.recordingInterval) clearInterval(this.recordingInterval);
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  private startPolling(): void {
    this.pollSubscription = interval(10000)
      .pipe(
        startWith(0),
        switchMap(() => this.jobService.getMessages(this.jobId))
      )
      .subscribe(msgs => {
        // Only update if count changed or first load to avoid flickering
        if (msgs.length !== this.messages.length) {
          this.messages = msgs;
          this.cdr.detectChanges();
        }
      });
  }

  private scrollToBottom(): void {
    try {
      this.scrollContainer.nativeElement.scrollTop = this.scrollContainer.nativeElement.scrollHeight;
    } catch (err) { }
  }

  shouldShowMeta(msg: any, index: number): boolean {
    if (index === 0) return true;
    const prev = this.messages[index - 1];
    // Show meta if sender changed or if time difference > 5 mins
    const timeDiff = new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime();
    return prev.sender_id !== msg.sender_id || timeDiff > 300000;
  }

  sendText(): void {
    if (!this.newMessage.trim()) return;
    const text = this.newMessage;
    this.newMessage = '';
    
    this.jobService.sendMessage(this.jobId, text).subscribe(res => {
      this.messages.push(res);
      this.scrollToBottom();
    });
  }

  // ── Audio Recording ────────────────────────────────────────────────────────

  async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.audioChunks = [];
      this.recordingDuration = 0;
      this.recordingStartTime = Date.now();

      this.mediaRecorder.ondataavailable = (event: any) => {
        this.audioChunks.push(event.data);
      };

      this.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        const duration = (Date.now() - this.recordingStartTime) / 1000;
        if (duration > 1) { // Min 1 second
          this.jobService.sendAudioMessage(this.jobId, audioBlob, duration).subscribe(res => {
            this.messages.push(res);
            this.scrollToBottom();
          });
        }
        stream.getTracks().forEach(track => track.stop());
      };

      this.mediaRecorder.start();
      this.isRecording = true;
      this.recordingInterval = setInterval(() => this.recordingDuration++, 1000);
    } catch (err) {
      console.error('Microphone access denied', err);
    }
  }

  stopRecording(): void {
    if (this.mediaRecorder && this.isRecording) {
      this.mediaRecorder.stop();
      this.isRecording = false;
      clearInterval(this.recordingInterval);
    }
  }

  // ── Audio Playback ─────────────────────────────────────────────────────────

  getAudioUrl(url: string): string {
    return url.startsWith('http') ? url : `http://localhost:3000${url}`;
  }

  togglePlay(msg: any, index: number): void {
    const audioElements = document.querySelectorAll('audio');
    const player = audioElements[index] as HTMLAudioElement;

    if (msg.playing) {
      player.pause();
      msg.playing = false;
    } else {
      // Stop all other playing audios
      this.messages.forEach((m, idx) => {
        if (m.playing) {
          m.playing = false;
          (audioElements[idx] as HTMLAudioElement).pause();
        }
      });
      player.play();
      msg.playing = true;
    }
  }

  onTimeUpdate(event: any, msg: any): void {
    const audio = event.target as HTMLAudioElement;
    msg.progress = (audio.currentTime / audio.duration) * 100;
  }

  onAudioEnded(msg: any): void {
    msg.playing = false;
    msg.progress = 0;
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
