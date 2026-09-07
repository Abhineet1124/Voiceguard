# Phase 2: Audio Pipeline Implementation

**Goal:** Build robust audio validation, preprocessing, and feature extraction.

## Components to Implement

### 1. Audio Validation Service
**File:** `backend/app/services/audio_validator.py`

```python
# Validates:
# - File format (WAV, MP3, M4A, OGG)
# - File size (< 50MB)
# - Audio duration (0.5s - 120s)
# - Sample rate (8000, 16000, 22050, 44100, 48000 Hz)
# - Channel count
# - Corruption detection

def validate_audio_file(file_path: str) -> ValidationResult
def get_audio_metadata(file_path: str) -> AudioMetadata
```

### 2. Audio Preprocessing Service
**File:** `backend/app/services/audio_preprocessor.py`

```python
# Implements:
# - Load audio with librosa
# - Resampling to 16kHz (standard for speech)
# - Mono conversion
# - Amplitude normalization ([-1, 1] range)
# - Silence trimming
# - Energy-based voice activity detection (VAD)
# - Optional noise reduction (scipy/librosa)

def preprocess_audio(audio_path: str) -> np.ndarray
def resample_audio(audio: np.ndarray, sr_orig: int, sr_target: int) -> np.ndarray
def normalize_audio(audio: np.ndarray) -> np.ndarray
def detect_silence(audio: np.ndarray, sr: int) -> Tuple[int, int]
```

### 3. Feature Extraction Service
**File:** `backend/app/services/feature_extractor.py`

```python
# Extracts multiple features:
# - Mel spectrogram (64 mels, 2048 FFT)
# - MFCC (13 coefficients)
# - Spectral features (centroid, bandwidth, rolloff)
# - Zero-crossing rate
# - Chroma features
# - RMS energy

def extract_mel_spectrogram(audio: np.ndarray, sr: int) -> np.ndarray
def extract_mfcc(audio: np.ndarray, sr: int) -> np.ndarray
def extract_spectral_features(audio: np.ndarray, sr: int) -> Dict
def extract_temporal_features(audio: np.ndarray, sr: int) -> Dict
```

### 4. ML Feature Extractor
**File:** `backend/app/ml/feature_extractor.py`

```python
# Modular design for easy model addition
# Supports loading pre-extracted features

class FeatureExtractor:
    def extract(self, audio: np.ndarray, sr: int) -> np.ndarray
    def save_features(self, features: np.ndarray, path: str)
    def load_features(self, path: str) -> np.ndarray
```

### 5. Audio Manager Service
**File:** `backend/app/services/audio_manager.py`

```python
# Handles temporary file management
# Secure cleanup
# No raw audio persistence (by default)

def save_temp_audio(file_obj) -> str
def cleanup_temp_audio(path: str)
def save_features_only(features: np.ndarray, analysis_id: str)
```

## Database Updates

Add to `AnalysisResult` model:
```python
audio_duration: Float
sample_rate: Integer
channels: Integer
preprocessing_params: JSON
features_hash: String
```

## UI Updates

### Dashboard Enhancements
- Show audio duration in recent analyses
- Add processing time chart
- Show validation errors/warnings

### Analysis Page Enhancements
- Audio playback with waveform visualization
- Show extracted features
- Processing step indicator
- Validation feedback

## API Updates

Update `/api/analyze` response:
```json
{
  "...existing fields...",
  "audio_metadata": {
    "duration": 3.5,
    "sample_rate": 16000,
    "channels": 1
  },
  "preprocessing": {
    "steps": ["resample", "mono", "normalize"],
    "duration_ms": 145
  },
  "features": {
    "type": "mel_spectrogram",
    "shape": [64, 128],
    "extraction_time_ms": 78
  }
}
```

## Testing Strategy

### Unit Tests
- Audio validation with edge cases
- Resampling correctness
- Feature shape validation
- Silence detection accuracy

### Integration Tests
- Full pipeline with test audio files
- Format conversion tests
- Error handling

### Test Audio Files Needed
- Valid WAV, MP3, M4A
- Short and long durations
- Different sample rates
- Mono and stereo
- Corrupted files
- Silence-only files

## Implementation Order
1. Audio validator
2. Audio preprocessor
3. Feature extractors (librosa-based)
4. Audio manager
5. Update API endpoint
6. Update database schema
7. Update UI with previews
8. Add comprehensive tests

## Success Criteria
- ✅ Audio formats properly detected
- ✅ Resampling produces correct output
- ✅ Feature extraction is deterministic
- ✅ Processing time < 500ms for 10s audio
- ✅ All errors are informative
- ✅ No audio data persisted without encryption
