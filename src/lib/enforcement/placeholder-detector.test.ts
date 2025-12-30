/**
 * Placeholder Detector Tests
 */

import { describe, it, expect } from 'vitest';
import { PlaceholderDetector } from './placeholder-detector';
import { PLACEHOLDER_REGEX } from '@/types/enforcement';

describe('PlaceholderDetector', () => {
  const detector = new PlaceholderDetector();

  describe('detectPlaceholders', () => {
    it('should detect MISSING_DATA placeholders', () => {
      const content = 'Our budget is [[PLACEHOLDER:MISSING_DATA:Annual budget amount:ph_123abc]] and we serve [[PLACEHOLDER:MISSING_DATA:Number of clients:ph_456def]] clients.';
      
      const placeholders = detector.detectPlaceholders(content);
      
      expect(placeholders).toHaveLength(2);
      expect(placeholders[0].type).toBe('MISSING_DATA');
      expect(placeholders[0].description).toBe('Annual budget amount');
      expect(placeholders[1].type).toBe('MISSING_DATA');
      expect(placeholders[1].description).toBe('Number of clients');
    });

    it('should detect USER_INPUT_REQUIRED placeholders', () => {
      const content = 'Please specify [[PLACEHOLDER:USER_INPUT_REQUIRED:Project start date:ph_abc123]].';
      
      const placeholders = detector.detectPlaceholders(content);
      
      expect(placeholders).toHaveLength(1);
      expect(placeholders[0].type).toBe('USER_INPUT_REQUIRED');
      expect(placeholders[0].description).toBe('Project start date');
    });

    it('should detect VERIFICATION_NEEDED placeholders', () => {
      const content = 'We achieved [[PLACEHOLDER:VERIFICATION_NEEDED:Success rate percentage:ph_xyz789]] success rate.';
      
      const placeholders = detector.detectPlaceholders(content);
      
      expect(placeholders).toHaveLength(1);
      expect(placeholders[0].type).toBe('VERIFICATION_NEEDED');
    });

    it('should return empty array for content without placeholders', () => {
      const content = 'This is regular content without any placeholders.';
      
      const placeholders = detector.detectPlaceholders(content);
      
      expect(placeholders).toHaveLength(0);
    });

    it('should capture correct positions', () => {
      const content = 'Start [[PLACEHOLDER:MISSING_DATA:test:ph_001]] end';
      
      const placeholders = detector.detectPlaceholders(content);
      
      expect(placeholders).toHaveLength(1);
      expect(placeholders[0].position.start).toBe(6);
      expect(content.slice(placeholders[0].position.start, placeholders[0].position.end))
        .toBe('[[PLACEHOLDER:MISSING_DATA:test:ph_001]]');
    });
  });

  describe('hasPlaceholders', () => {
    it('should return true when content has placeholders', () => {
      const content = 'Content with [[PLACEHOLDER:MISSING_DATA:test:ph_001]] in it.';
      expect(detector.hasPlaceholders(content)).toBe(true);
    });

    it('should return false when content has no placeholders', () => {
      const content = 'Regular content without placeholders.';
      expect(detector.hasPlaceholders(content)).toBe(false);
    });
  });

  describe('countBlockingPlaceholders', () => {
    it('should count only blocking placeholder types', () => {
      const content = `
        [[PLACEHOLDER:MISSING_DATA:data1:ph_001]]
        [[PLACEHOLDER:USER_INPUT_REQUIRED:input1:ph_002]]
        [[PLACEHOLDER:VERIFICATION_NEEDED:verify1:ph_003]]
      `;
      
      // MISSING_DATA and USER_INPUT_REQUIRED are blocking
      // VERIFICATION_NEEDED is not blocking
      expect(detector.countBlockingPlaceholders(content)).toBe(2);
    });
  });

  describe('createPlaceholder', () => {
    it('should create valid placeholder strings', () => {
      const placeholder = PlaceholderDetector.createPlaceholder(
        'MISSING_DATA',
        'Budget amount',
        'custom_id'
      );
      
      expect(placeholder).toBe('[[PLACEHOLDER:MISSING_DATA:Budget amount:custom_id]]');
      
      // Should be detectable by the regex
      const regex = new RegExp(PLACEHOLDER_REGEX.source, 'g');
      expect(regex.test(placeholder)).toBe(true);
    });

    it('should generate ID if not provided', () => {
      const placeholder = PlaceholderDetector.createPlaceholder(
        'USER_INPUT_REQUIRED',
        'Start date'
      );
      
      expect(placeholder).toMatch(/\[\[PLACEHOLDER:USER_INPUT_REQUIRED:Start date:[a-z0-9]+\]\]/);
    });
  });
});
