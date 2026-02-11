/**
 * Map of known audio MIME types to their corresponding file extensions
 */
export const AUDIO_MIME_TO_EXTENSION: Record<string, string> = {
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/webm': 'webm',
  'video/webm': 'webm',
  'video/mp4': 'mp4',
  'audio/ogg': 'ogg',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
};

/**
 * Determine the appropriate filename for an audio file based on MIME type and original name
 * @param mimeType - The MIME type of the audio file
 * @param originalName - The original filename (if available)
 * @returns A suitable filename for the audio file
 */
export function getAudioFilename(mimeType: string, originalName?: string): string {
  const fallbackExt = AUDIO_MIME_TO_EXTENSION[mimeType] || 'bin';
  
  // Use original name if it has an extension
  if (originalName && originalName.includes('.')) {
    return originalName;
  }
  
  return `audio.${fallbackExt}`;
}
