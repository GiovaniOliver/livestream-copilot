/**
 * Branding Service Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import {
  getPositionCoordinates,
  DEFAULT_BRANDING_CONFIG,
} from '../../export/branding-types';
import type { BrandingConfig, LogoOverlay, LowerThird } from '../../export/branding-types';

// Use vi.hoisted to create mock functions that can be referenced in vi.mock
const { mockExistsSync, mockMkdirSync, mockStatSync, mockWriteFileSync, mockUnlinkSync, mockRmSync } = vi.hoisted(() => ({
  mockExistsSync: vi.fn(),
  mockMkdirSync: vi.fn(),
  mockStatSync: vi.fn(() => ({ size: 1024 })),
  mockWriteFileSync: vi.fn(),
  mockUnlinkSync: vi.fn(),
  mockRmSync: vi.fn(),
}));

// Mock fs module
vi.mock('fs', () => ({
  default: {
    existsSync: mockExistsSync,
    mkdirSync: mockMkdirSync,
    statSync: mockStatSync,
    writeFileSync: mockWriteFileSync,
    unlinkSync: mockUnlinkSync,
    rmSync: mockRmSync,
  },
  existsSync: mockExistsSync,
  mkdirSync: mockMkdirSync,
  statSync: mockStatSync,
  writeFileSync: mockWriteFileSync,
  unlinkSync: mockUnlinkSync,
  rmSync: mockRmSync,
}));

// Mock fluent-ffmpeg
vi.mock('fluent-ffmpeg', () => ({
  default: vi.fn(() => ({
    input: vi.fn().mockReturnThis(),
    complexFilter: vi.fn().mockReturnThis(),
    videoFilters: vi.fn().mockReturnThis(),
    videoCodec: vi.fn().mockReturnThis(),
    audioCodec: vi.fn().mockReturnThis(),
    outputOptions: vi.fn().mockReturnThis(),
    output: vi.fn().mockReturnThis(),
    duration: vi.fn().mockReturnThis(),
    on: vi.fn().mockImplementation(function (event, callback) {
      if (event === 'end') {
        setTimeout(() => callback(), 10);
      }
      return this;
    }),
    run: vi.fn(),
  })),
}));

// Import after mocks are set up
import { validateBrandingConfig } from '../../export/branding-service';

describe('Branding Types', () => {
  describe('getPositionCoordinates', () => {
    it('should return correct coordinates for top-left', () => {
      const result = getPositionCoordinates('top-left', 100, 50, 20);
      expect(result.x).toBe('20');
      expect(result.y).toBe('20');
    });

    it('should return correct coordinates for top-center', () => {
      const result = getPositionCoordinates('top-center', 100, 50, 20);
      expect(result.x).toBe('(main_w-overlay_w)/2');
      expect(result.y).toBe('20');
    });

    it('should return correct coordinates for top-right', () => {
      const result = getPositionCoordinates('top-right', 100, 50, 20);
      expect(result.x).toBe('main_w-overlay_w-20');
      expect(result.y).toBe('20');
    });

    it('should return correct coordinates for center', () => {
      const result = getPositionCoordinates('center', 100, 50, 20);
      expect(result.x).toBe('(main_w-overlay_w)/2');
      expect(result.y).toBe('(main_h-overlay_h)/2');
    });

    it('should return correct coordinates for bottom-right', () => {
      const result = getPositionCoordinates('bottom-right', 100, 50, 20);
      expect(result.x).toBe('main_w-overlay_w-20');
      expect(result.y).toBe('main_h-overlay_h-20');
    });

    it('should return correct coordinates for bottom-left', () => {
      const result = getPositionCoordinates('bottom-left', 100, 50, 20);
      expect(result.x).toBe('20');
      expect(result.y).toBe('main_h-overlay_h-20');
    });

    it('should return correct coordinates for bottom-center', () => {
      const result = getPositionCoordinates('bottom-center', 100, 50, 20);
      expect(result.x).toBe('(main_w-overlay_w)/2');
      expect(result.y).toBe('main_h-overlay_h-20');
    });

    it('should return correct coordinates for center-left', () => {
      const result = getPositionCoordinates('center-left', 100, 50, 20);
      expect(result.x).toBe('20');
      expect(result.y).toBe('(main_h-overlay_h)/2');
    });

    it('should return correct coordinates for center-right', () => {
      const result = getPositionCoordinates('center-right', 100, 50, 20);
      expect(result.x).toBe('main_w-overlay_w-20');
      expect(result.y).toBe('(main_h-overlay_h)/2');
    });
  });

  describe('DEFAULT_BRANDING_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_BRANDING_CONFIG.name).toBe('Default');
      expect(DEFAULT_BRANDING_CONFIG.primaryColor).toBe('#00D4AA');
      expect(DEFAULT_BRANDING_CONFIG.secondaryColor).toBe('#7B61FF');
      expect(DEFAULT_BRANDING_CONFIG.fontFamily).toBe('Arial');
      expect(DEFAULT_BRANDING_CONFIG.audioDucking).toBe(false);
      expect(DEFAULT_BRANDING_CONFIG.audioDuckingLevel).toBe(0.3);
    });
  });
});

describe('validateBrandingConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExistsSync.mockReturnValue(true);
  });

  it('should return empty array for valid minimal config', () => {
    const config: BrandingConfig = {
      name: 'Test Preset',
    };

    const errors = validateBrandingConfig(config);
    expect(errors).toEqual([]);
  });

  it('should validate logo path exists', () => {
    mockExistsSync.mockReturnValue(false);

    const config: BrandingConfig = {
      name: 'Test',
      logo: {
        path: '/nonexistent/logo.png',
        position: 'top-left',
        widthPercent: 20,
        opacity: 1,
        margin: 10,
      },
    };

    const errors = validateBrandingConfig(config);
    expect(errors).toContain('Logo file not found: /nonexistent/logo.png');
  });

  it('should validate logo width percent range', () => {
    mockExistsSync.mockReturnValue(true);

    const config: BrandingConfig = {
      name: 'Test',
      logo: {
        path: '/valid/logo.png',
        position: 'top-left',
        widthPercent: 60, // Too high
        opacity: 1,
        margin: 10,
      },
    };

    const errors = validateBrandingConfig(config);
    expect(errors).toContain('Logo width must be between 1% and 50%');
  });

  it('should validate logo width percent minimum', () => {
    mockExistsSync.mockReturnValue(true);

    const config: BrandingConfig = {
      name: 'Test',
      logo: {
        path: '/valid/logo.png',
        position: 'top-left',
        widthPercent: 0, // Too low
        opacity: 1,
        margin: 10,
      },
    };

    const errors = validateBrandingConfig(config);
    expect(errors).toContain('Logo width must be between 1% and 50%');
  });

  it('should validate logo opacity range', () => {
    mockExistsSync.mockReturnValue(true);

    const config: BrandingConfig = {
      name: 'Test',
      logo: {
        path: '/valid/logo.png',
        position: 'top-left',
        widthPercent: 20,
        opacity: 1.5, // Too high
        margin: 10,
      },
    };

    const errors = validateBrandingConfig(config);
    expect(errors).toContain('Logo opacity must be between 0 and 1');
  });

  it('should validate intro path exists', () => {
    mockExistsSync.mockReturnValue(false);

    const config: BrandingConfig = {
      name: 'Test',
      intro: {
        path: '/nonexistent/intro.mp4',
        duration: 5,
      },
    };

    const errors = validateBrandingConfig(config);
    expect(errors).toContain('Intro file not found: /nonexistent/intro.mp4');
  });

  it('should validate outro path exists', () => {
    mockExistsSync.mockReturnValue(false);

    const config: BrandingConfig = {
      name: 'Test',
      outro: {
        path: '/nonexistent/outro.mp4',
        duration: 5,
      },
    };

    const errors = validateBrandingConfig(config);
    expect(errors).toContain('Outro file not found: /nonexistent/outro.mp4');
  });

  it('should validate lower third text required', () => {
    const config: BrandingConfig = {
      name: 'Test',
      lowerThirds: [
        {
          text: '', // Empty
          startTime: 0,
          duration: 5,
          position: 'center',
          textColor: '#ffffff',
          backgroundColor: '#000000',
          fontSize: 24,
        },
      ],
    };

    const errors = validateBrandingConfig(config);
    expect(errors).toContain('Lower third 1: text is required');
  });

  it('should validate lower third duration positive', () => {
    const config: BrandingConfig = {
      name: 'Test',
      lowerThirds: [
        {
          text: 'Test',
          startTime: 0,
          duration: -1, // Negative
          position: 'center',
          textColor: '#ffffff',
          backgroundColor: '#000000',
          fontSize: 24,
        },
      ],
    };

    const errors = validateBrandingConfig(config);
    expect(errors).toContain('Lower third 1: duration must be positive');
  });

  it('should validate multiple lower thirds', () => {
    const config: BrandingConfig = {
      name: 'Test',
      lowerThirds: [
        {
          text: '',
          startTime: 0,
          duration: 5,
          position: 'center',
          textColor: '#ffffff',
          backgroundColor: '#000000',
          fontSize: 24,
        },
        {
          text: 'Valid',
          startTime: 5,
          duration: 0,
          position: 'left',
          textColor: '#ffffff',
          backgroundColor: '#000000',
          fontSize: 24,
        },
      ],
    };

    const errors = validateBrandingConfig(config);
    expect(errors).toContain('Lower third 1: text is required');
    expect(errors).toContain('Lower third 2: duration must be positive');
  });

  it('should return multiple errors for invalid config', () => {
    mockExistsSync.mockReturnValue(false);

    const config: BrandingConfig = {
      name: 'Test',
      logo: {
        path: '/nonexistent/logo.png',
        position: 'top-left',
        widthPercent: 60,
        opacity: 1.5,
        margin: 10,
      },
      intro: {
        path: '/nonexistent/intro.mp4',
        duration: 5,
      },
    };

    const errors = validateBrandingConfig(config);
    expect(errors.length).toBeGreaterThan(2);
  });
});

describe('BrandingConfig types', () => {
  it('should allow valid LogoOverlay', () => {
    const logo: LogoOverlay = {
      path: '/path/to/logo.png',
      position: 'bottom-right',
      widthPercent: 15,
      opacity: 0.8,
      margin: 20,
      fadeIn: 0.5,
      fadeOut: 0.5,
      delay: 2,
      duration: 10,
    };

    expect(logo.path).toBe('/path/to/logo.png');
    expect(logo.position).toBe('bottom-right');
    expect(logo.fadeIn).toBe(0.5);
  });

  it('should allow valid LowerThird', () => {
    const lowerThird: LowerThird = {
      text: 'John Doe',
      subtitle: 'CEO, Acme Corp',
      startTime: 5,
      duration: 8,
      position: 'left',
      textColor: '#ffffff',
      backgroundColor: '#00000099',
      fontSize: 32,
      fontFamily: 'Helvetica',
      fadeDuration: 0.3,
    };

    expect(lowerThird.text).toBe('John Doe');
    expect(lowerThird.subtitle).toBe('CEO, Acme Corp');
    expect(lowerThird.fadeDuration).toBe(0.3);
  });

  it('should allow valid BrandingConfig', () => {
    const config: BrandingConfig = {
      id: 'preset-123',
      name: 'My Brand',
      logo: {
        path: '/logo.png',
        position: 'top-right',
        widthPercent: 10,
        opacity: 1,
        margin: 15,
      },
      intro: {
        path: '/intro.mp4',
        duration: 3,
        fadeTransition: 0.5,
        audioMode: 'fade',
      },
      outro: {
        path: '/outro.mp4',
        duration: 5,
        audioMode: 'keep',
      },
      lowerThirds: [
        {
          text: 'Speaker Name',
          startTime: 0,
          duration: 5,
          position: 'center',
          textColor: '#fff',
          backgroundColor: '#000',
          fontSize: 28,
        },
      ],
      primaryColor: '#00D4AA',
      secondaryColor: '#7B61FF',
      fontFamily: 'Inter',
      audioDucking: true,
      audioDuckingLevel: 0.2,
    };

    expect(config.name).toBe('My Brand');
    expect(config.logo?.widthPercent).toBe(10);
    expect(config.intro?.fadeTransition).toBe(0.5);
    expect(config.audioDucking).toBe(true);
  });
});
