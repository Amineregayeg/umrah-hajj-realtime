# Quran Module Test Specification

Comprehensive test specification for the Quran testing module covering all functionality, edge cases, and user scenarios.

## Test Environment

**Backend URL**: `https://psychological-jilli-amineregayeg-1fe35444.koyeb.app`
**Test Interface**: `/mnt/d/umrah-hajj-realtime/test-prototype/quran-test.html`
**Module Version**: 1.0.0
**Last Updated**: October 2025

---

## 1. Get Surah Tests

### 1.1 Valid Surah Retrieval

#### Test Case 1.1.1: Get First Surah (Al-Fatihah) in Arabic
- **Endpoint**: `GET /content/quran/surah/1?lang=ar`
- **Steps**:
  1. Select "1. Al-Fatihah" from dropdown
  2. Select "Arabic" language
  3. Click "Get Surah" button
- **Expected**:
  - Surah header displays with title in Arabic
  - Bismillah displayed
  - 7 Ayahs rendered with Arabic text
  - Proper RTL rendering
  - Green and gold color scheme
- **Pass Criteria**: All Ayahs visible, Arabic text readable, no errors

#### Test Case 1.1.2: Get Longest Surah (Al-Baqarah) in Arabic
- **Endpoint**: `GET /content/quran/surah/2?lang=ar`
- **Steps**:
  1. Select "2. Al-Baqarah" from dropdown
  2. Select "Arabic" language
  3. Click "Get Surah" button
- **Expected**:
  - Surah header displays
  - 286 Ayahs rendered
  - Page remains responsive
  - Scrolling works smoothly
- **Pass Criteria**: All 286 Ayahs load, performance acceptable (<3s)

#### Test Case 1.1.3: Get Surah in English
- **Endpoint**: `GET /content/quran/surah/1?lang=en`
- **Steps**:
  1. Select any Surah
  2. Select "English" language
  3. Click "Get Surah" button
- **Expected**:
  - English translation displayed
  - LTR text direction
  - Proper English fonts
- **Pass Criteria**: English text displays correctly, readable formatting

#### Test Case 1.1.4: Get Surah 9 (At-Tawbah - no Bismillah)
- **Endpoint**: `GET /content/quran/surah/9?lang=ar`
- **Steps**:
  1. Select "9. At-Tawbah"
  2. Click "Get Surah" button
- **Expected**:
  - Surah displays without Bismillah
  - 129 Ayahs rendered
- **Pass Criteria**: No Bismillah shown, Ayahs display correctly

#### Test Case 1.1.5: Get Short Surah (Al-Ikhlas)
- **Endpoint**: `GET /content/quran/surah/112?lang=ar`
- **Steps**:
  1. Select "112. Al-Ikhlas"
  2. Click "Get Surah" button
- **Expected**:
  - 4 Ayahs displayed
  - Quick loading
  - Clean presentation
- **Pass Criteria**: Complete Surah visible, no layout issues

### 1.2 Invalid Surah Requests

#### Test Case 1.2.1: No Surah Selected
- **Steps**:
  1. Leave dropdown at "-- Choose a Surah --"
  2. Click "Get Surah" button
- **Expected**:
  - Error message: "Please select a Surah"
  - No API call made
- **Pass Criteria**: Validation error shown, no network request

#### Test Case 1.2.2: Invalid Surah ID (Direct API)
- **Endpoint**: `GET /content/quran/surah/200?lang=ar`
- **Expected**:
  - HTTP 400 or 404 error
  - Error message displayed
- **Pass Criteria**: Error handled gracefully, user-friendly message

### 1.3 Loading States

#### Test Case 1.3.1: Loading Indicator Visible
- **Steps**:
  1. Select long Surah (e.g., Al-Baqarah)
  2. Click "Get Surah" button
  3. Observe loading state
- **Expected**:
  - Spinner appears immediately
  - "Loading..." text visible
  - Button disabled during load
- **Pass Criteria**: Loading indicator shows, button disabled

#### Test Case 1.3.2: Loading Indicator Hides
- **Steps**:
  1. Wait for Surah to load
  2. Observe loading state
- **Expected**:
  - Spinner disappears after load
  - Content displayed
  - Button re-enabled
- **Pass Criteria**: Loading indicator clears, content shows

---

## 2. Search Quran Tests

### 2.1 Valid Search Operations

#### Test Case 2.1.1: Search Arabic Text
- **Endpoint**: `GET /content/quran/search?q=الله&lang=ar&limit=10`
- **Steps**:
  1. Enter "الله" in search box
  2. Select "Arabic" language
  3. Set limit to 10
  4. Click "Search" button
- **Expected**:
  - Results displayed with Arabic text
  - Search term highlighted in yellow
  - Result count shown
  - RTL formatting
- **Pass Criteria**: Results appear, highlighting works, count accurate

#### Test Case 2.1.2: Search English Text
- **Endpoint**: `GET /content/quran/search?q=prayer&lang=en&limit=10`
- **Steps**:
  1. Enter "prayer" in search box
  2. Select "English" language
  3. Click "Search" button
- **Expected**:
  - English results displayed
  - "prayer" highlighted
  - Surah references shown
- **Pass Criteria**: English results correct, highlighting visible

#### Test Case 2.1.3: Search with Large Limit
- **Endpoint**: `GET /content/quran/search?q=God&lang=en&limit=100`
- **Steps**:
  1. Enter common term "God"
  2. Set limit to 100
  3. Click "Search" button
- **Expected**:
  - Up to 100 results shown
  - Page handles large result set
  - Scrolling smooth
- **Pass Criteria**: All results load, performance acceptable

#### Test Case 2.1.4: Search with Small Limit
- **Endpoint**: `GET /content/quran/search?q=الجنة&lang=ar&limit=3`
- **Steps**:
  1. Enter "الجنة" (paradise)
  2. Set limit to 3
  3. Click "Search" button
- **Expected**:
  - Maximum 3 results shown
  - Result count indicates total available
- **Pass Criteria**: Exactly 3 or fewer results, count correct

#### Test Case 2.1.5: Search Rare Term
- **Endpoint**: `GET /content/quran/search?q=Thamud&lang=en&limit=10`
- **Steps**:
  1. Search for "Thamud" (rare historical reference)
  2. Click "Search" button
- **Expected**:
  - Few results (5-10)
  - Relevant verses shown
- **Pass Criteria**: Correct verses returned, accurate highlighting

### 2.2 Search Edge Cases

#### Test Case 2.2.1: No Results Found
- **Endpoint**: `GET /content/quran/search?q=xyzabc123&lang=en&limit=10`
- **Steps**:
  1. Search for gibberish "xyzabc123"
  2. Click "Search" button
- **Expected**:
  - "No results found" message
  - Suggestion to try different term
- **Pass Criteria**: Friendly no-results message, no errors

#### Test Case 2.2.2: Empty Search Query
- **Steps**:
  1. Leave search box empty
  2. Click "Search" button
- **Expected**:
  - Error message: "Please enter a search query"
  - No API call made
- **Pass Criteria**: Validation error, no network request

#### Test Case 2.2.3: Very Long Search Query
- **Steps**:
  1. Enter very long text (100+ characters)
  2. Click "Search" button
- **Expected**:
  - Query properly encoded in URL
  - API processes or rejects gracefully
- **Pass Criteria**: No client-side error, handles response

#### Test Case 2.2.4: Special Characters in Query
- **Steps**:
  1. Search for "& < > \" '"
  2. Click "Search" button
- **Expected**:
  - Characters properly escaped
  - No XSS vulnerability
  - Results or "no results" message
- **Pass Criteria**: Safe handling, no security issues

### 2.3 Search Result Interaction

#### Test Case 2.3.1: Click Result to Load Surah
- **Steps**:
  1. Perform any search
  2. Click on a search result
- **Expected**:
  - Full Surah loads in Surah display section
  - Page scrolls to Surah display
  - Surah contains the clicked Ayah
- **Pass Criteria**: Surah loads, auto-scroll works

#### Test Case 2.3.2: Hover Effects
- **Steps**:
  1. Perform search
  2. Hover over results
- **Expected**:
  - Visual feedback (shadow, lift effect)
  - Cursor changes to pointer
- **Pass Criteria**: Hover states work, clickable indication

---

## 3. Get Ayah Tests

### 3.1 Valid Ayah Retrieval

#### Test Case 3.1.1: Get Ayat al-Kursi (2:255)
- **Endpoint**: `GET /content/quran/ayah?surah=2&ayah=255&lang=ar`
- **Steps**:
  1. Enter Surah: 2
  2. Enter Ayah: 255
  3. Select "Arabic"
  4. Click "Get Ayah" button
- **Expected**:
  - Famous Ayat al-Kursi displayed
  - Large, centered Arabic text
  - Surah reference shown
- **Pass Criteria**: Correct Ayah displays, formatting beautiful

#### Test Case 3.1.2: Get First Ayah (1:1)
- **Endpoint**: `GET /content/quran/ayah?surah=1&ayah=1&lang=ar`
- **Steps**:
  1. Enter Surah: 1
  2. Enter Ayah: 1
  3. Click "Get Ayah" button
- **Expected**:
  - First Ayah of Quran
  - Bismillah or first verse
- **Pass Criteria**: Correct first Ayah shown

#### Test Case 3.1.3: Get Ayah in English
- **Endpoint**: `GET /content/quran/ayah?surah=112&ayah=1&lang=en`
- **Steps**:
  1. Enter Surah: 112
  2. Enter Ayah: 1
  3. Select "English"
  4. Click "Get Ayah" button
- **Expected**:
  - English translation displayed
  - LTR formatting
- **Pass Criteria**: English text correct, readable

#### Test Case 3.1.4: Get Last Ayah of Surah
- **Endpoint**: `GET /content/quran/ayah?surah=1&ayah=7&lang=ar`
- **Steps**:
  1. Enter last Ayah of Al-Fatihah
  2. Click "Get Ayah" button
- **Expected**:
  - Last verse of Surah displayed
  - No errors
- **Pass Criteria**: Correct Ayah, proper formatting

### 3.2 Invalid Ayah Requests

#### Test Case 3.2.1: Empty Fields
- **Steps**:
  1. Leave both fields empty
  2. Click "Get Ayah" button
- **Expected**:
  - Error message: "Please enter Surah and Ayah numbers"
  - No API call
- **Pass Criteria**: Validation error, no network request

#### Test Case 3.2.2: Invalid Surah Number (0)
- **Steps**:
  1. Enter Surah: 0
  2. Enter Ayah: 1
  3. Click "Get Ayah" button
- **Expected**:
  - Error from API or validation
  - User-friendly error message
- **Pass Criteria**: Error handled gracefully

#### Test Case 3.2.3: Invalid Surah Number (>114)
- **Steps**:
  1. Enter Surah: 200
  2. Enter Ayah: 1
  3. Click "Get Ayah" button
- **Expected**:
  - API error (400/404)
  - Error message displayed
- **Pass Criteria**: Error caught, message shown

#### Test Case 3.2.4: Invalid Ayah Number (too high)
- **Steps**:
  1. Enter Surah: 1 (only 7 Ayahs)
  2. Enter Ayah: 100
  3. Click "Get Ayah" button
- **Expected**:
  - API error (404/400)
  - Error message about invalid Ayah
- **Pass Criteria**: Error handled, helpful message

#### Test Case 3.2.5: Negative Numbers
- **Steps**:
  1. Enter Surah: -1
  2. Enter Ayah: -1
  3. Click "Get Ayah" button
- **Expected**:
  - HTML5 validation prevents or API rejects
  - Error message shown
- **Pass Criteria**: Invalid input rejected

---

## 4. UI/UX Tests

### 4.1 Responsive Design

#### Test Case 4.1.1: Desktop View (1920x1080)
- **Steps**:
  1. Open in full desktop browser
  2. Test all features
- **Expected**:
  - Clean layout, proper spacing
  - All controls visible
  - Text readable
- **Pass Criteria**: Professional appearance, no overflow

#### Test Case 4.1.2: Tablet View (768x1024)
- **Steps**:
  1. Resize browser to tablet size
  2. Test all features
- **Expected**:
  - Controls stack appropriately
  - Text remains readable
  - No horizontal scroll
- **Pass Criteria**: Functional on tablet, good UX

#### Test Case 4.1.3: Mobile View (375x667)
- **Steps**:
  1. Resize to mobile dimensions
  2. Test all features
- **Expected**:
  - Single column layout
  - Buttons full width
  - Arabic text still readable
- **Pass Criteria**: Usable on mobile, no broken layout

### 4.2 Arabic Text Rendering

#### Test Case 4.2.1: RTL Direction
- **Steps**:
  1. Load any Arabic Surah
  2. Check text alignment
- **Expected**:
  - Text aligned right
  - Numbers on right side
  - Proper flow
- **Pass Criteria**: Correct RTL rendering

#### Test Case 4.2.2: Font Rendering
- **Steps**:
  1. Load Arabic text
  2. Check font appearance
- **Expected**:
  - Traditional Islamic font (Amiri/Scheherazade)
  - Characters connected properly
  - Diacritics visible
- **Pass Criteria**: Beautiful, readable Arabic

#### Test Case 4.2.3: Line Height and Spacing
- **Steps**:
  1. Load long Ayah in Arabic
  2. Check readability
- **Expected**:
  - Adequate line height (2+)
  - Comfortable spacing
  - No text overlap
- **Pass Criteria**: Easy to read, proper spacing

### 4.3 Accessibility

#### Test Case 4.3.1: Keyboard Navigation
- **Steps**:
  1. Navigate using Tab key
  2. Activate using Enter/Space
- **Expected**:
  - Logical tab order
  - Focus indicators visible
  - All controls accessible
- **Pass Criteria**: Fully keyboard navigable

#### Test Case 4.3.2: Screen Reader Support
- **Steps**:
  1. Test with screen reader (NVDA/JAWS)
  2. Navigate through content
- **Expected**:
  - Semantic HTML structure
  - Labels announced
  - Content readable
- **Pass Criteria**: Screen reader friendly

#### Test Case 4.3.3: High Contrast Mode
- **Steps**:
  1. Enable high contrast mode
  2. Check visibility
- **Expected**:
  - All elements visible
  - Borders clear
  - Text readable
- **Pass Criteria**: Usable in high contrast

---

## 5. Performance Tests

### 5.1 Load Times

#### Test Case 5.1.1: Small Surah Load Time
- **Steps**:
  1. Load Surah 1 (7 Ayahs)
  2. Measure time
- **Expected**: <500ms
- **Pass Criteria**: Loads in under 1 second

#### Test Case 5.1.2: Large Surah Load Time
- **Steps**:
  1. Load Surah 2 (286 Ayahs)
  2. Measure time
- **Expected**: <3s
- **Pass Criteria**: Loads in under 5 seconds

#### Test Case 5.1.3: Search Response Time
- **Steps**:
  1. Perform search
  2. Measure time to results
- **Expected**: <1s
- **Pass Criteria**: Results in under 2 seconds

### 5.2 Rendering Performance

#### Test Case 5.2.1: Smooth Scrolling
- **Steps**:
  1. Load long Surah
  2. Scroll through content
- **Expected**:
  - 60fps scrolling
  - No jank or stutter
- **Pass Criteria**: Smooth scroll experience

#### Test Case 5.2.2: Multiple Rapid Requests
- **Steps**:
  1. Click different Surahs rapidly
  2. Observe behavior
- **Expected**:
  - Cancels previous request or handles queue
  - No crashes
  - Eventually displays last selected
- **Pass Criteria**: Handles rapid clicks gracefully

---

## 6. Error Handling Tests

### 6.1 Network Errors

#### Test Case 6.1.1: Offline Mode
- **Steps**:
  1. Disconnect network
  2. Try to load Surah
- **Expected**:
  - Error message about network
  - User-friendly explanation
- **Pass Criteria**: Clear error message, no crash

#### Test Case 6.1.2: API Server Down
- **Steps**:
  1. Point to invalid URL
  2. Try to load data
- **Expected**:
  - Connection error message
  - Suggestion to try again
- **Pass Criteria**: Helpful error, recovery option

#### Test Case 6.1.3: Timeout
- **Steps**:
  1. Simulate slow network (throttle)
  2. Observe behavior
- **Expected**:
  - Request times out gracefully
  - Error message shown
- **Pass Criteria**: Timeout handled, message clear

### 6.2 API Errors

#### Test Case 6.2.1: 400 Bad Request
- **Expected**: User-friendly message about invalid input
- **Pass Criteria**: Technical error translated to user message

#### Test Case 6.2.2: 404 Not Found
- **Expected**: Message about content not available
- **Pass Criteria**: Clear explanation, not technical

#### Test Case 6.2.3: 500 Server Error
- **Expected**: Message about server issue, try later
- **Pass Criteria**: Doesn't blame user, suggests retry

---

## 7. Integration Tests

### 7.1 Cross-Feature Integration

#### Test Case 7.1.1: Search → Surah → Ayah
- **Steps**:
  1. Search for term
  2. Click result to load Surah
  3. Note Ayah number from result
  4. Load that specific Ayah
- **Expected**: All three features work together seamlessly
- **Pass Criteria**: Data consistent across features

#### Test Case 7.1.2: Language Switching
- **Steps**:
  1. Load Surah in Arabic
  2. Switch to English
  3. Reload same Surah
- **Expected**: Same Surah, different language
- **Pass Criteria**: Language switch works correctly

---

## 8. Security Tests

### 8.1 XSS Prevention

#### Test Case 8.1.1: Script Injection in Search
- **Steps**:
  1. Enter `<script>alert('XSS')</script>` in search
  2. Execute search
- **Expected**: Text treated as literal, no script execution
- **Pass Criteria**: No alert, no XSS

#### Test Case 8.1.2: HTML Injection
- **Steps**:
  1. Enter HTML tags in input
  2. Submit
- **Expected**: Tags escaped or sanitized
- **Pass Criteria**: No HTML rendering, safe display

### 8.2 CORS

#### Test Case 8.2.1: Cross-Origin Requests
- **Steps**:
  1. Load from file:// protocol
  2. Make API requests
- **Expected**: CORS headers allow or deny appropriately
- **Pass Criteria**: Expected CORS behavior

---

## Test Execution Checklist

### Pre-Test Setup
- [ ] Backend API is running and accessible
- [ ] Test interface loaded in browser
- [ ] Network tools open (DevTools)
- [ ] Test data prepared

### Smoke Tests (Quick validation)
- [ ] Load Surah 1 in Arabic
- [ ] Search for "الله" in Arabic
- [ ] Get Ayah 2:255
- [ ] Check mobile view
- [ ] Verify error handling

### Full Regression (Complete test suite)
- [ ] All Get Surah tests (1.1-1.3)
- [ ] All Search tests (2.1-2.3)
- [ ] All Get Ayah tests (3.1-3.2)
- [ ] UI/UX tests (4.1-4.3)
- [ ] Performance tests (5.1-5.2)
- [ ] Error handling tests (6.1-6.2)
- [ ] Integration tests (7.1)
- [ ] Security tests (8.1-8.2)

### Browser Matrix
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Mobile Chrome (Android)

---

## Success Criteria

### Critical Requirements (Must Pass)
1. All API endpoints return valid data
2. Arabic text renders correctly with RTL
3. Search results are accurate and highlighted
4. No XSS vulnerabilities
5. Mobile responsive design works
6. Error messages are user-friendly
7. Loading states visible during requests

### Performance Requirements
1. Small Surah load: <1s
2. Large Surah load: <5s
3. Search results: <2s
4. Smooth scrolling (60fps)

### Quality Requirements
1. No console errors during normal operation
2. Graceful error handling for all edge cases
3. Accessible via keyboard
4. Professional visual design
5. Consistent behavior across browsers

---

## Defect Reporting Template

```markdown
**Test Case**: [ID and name]
**Severity**: [Critical/High/Medium/Low]
**Browser**: [Browser and version]
**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Expected Result**: [What should happen]
**Actual Result**: [What actually happened]
**Screenshots**: [If applicable]
**Console Errors**: [Any errors from DevTools]
**Network Response**: [API response if relevant]
```

---

## Test Summary Report Template

```markdown
# Quran Module Test Report

**Test Date**: [Date]
**Tester**: [Name]
**Backend Version**: [Version]
**Module Version**: 1.0.0

## Summary
- Total Tests: [X]
- Passed: [X]
- Failed: [X]
- Pass Rate: [X%]

## Critical Issues
[List any critical failures]

## Recommendations
[Suggestions for improvements]

## Sign-off
Tested by: [Name]
Date: [Date]
Status: [PASS/FAIL/CONDITIONAL PASS]
```

---

**Document Version**: 1.0
**Last Updated**: October 2025
**Status**: Ready for Testing
