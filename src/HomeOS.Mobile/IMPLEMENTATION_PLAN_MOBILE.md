# Mobile App Implementation Plan

## Phase 1: Core Data Sync (Offline Architecture)
The app currently can save transactions offline, but it lacks the necessary data (Categories, Accounts) to create meaningful records. We need to implement a "Sync Down" strategy.

- [x] **Database Schema Update**
    - [x] Create `categories` table in SQLite.
    - [x] Create `accounts` table in SQLite.
- [x] **Sync Services**
    - [x] Implement `syncCategories()`: Fetch from API -> Save/Update local DB.
    - [x] Implement `syncAccounts()`: Fetch from API -> Save/Update local DB.
    - [x] Add these to the `tryAutoSync()` flow.
- [x] **Transaction Screen Upgrade**
    - [x] Replace hardcoded Category ID with a real Selector component using local data.
    - [x] Add Account Selector (Wallet, Bank, etc.).
    - [x] Ensure `Income`/`Expense` toggle filters the category list.

## Phase 2: Scanner & Product Experience
Refine the barcode scanner to be robust and compliant with library standards.

- [x] **Fix Camera UI**
    - [x] Check `CameraView` nesting warning. Move overlay components to absolute positioning outside the Camera component.
- [x] **Product Intelligence**
    - [x] When a product is scanned and named by the user, save this relation (Barcode -> Name) locally. 
    - [x] Next time the same code is scanned, auto-fill the name instantly without needing the API.

## Phase 3: Analytics & History
Give the user visibility into their finances.

- [x] **History Screen**
    - [x] Create `app/history.tsx`.
    - [x] Fetch last 20 transactions from API.
    - [x] (Future) Cache these transactions locally for offline viewing.
- [x] **Dashboard Charts**
    - [x] Wire up the charts using `victory-native` or `react-native-gifted-charts` (since we have `react-native-svg`).


