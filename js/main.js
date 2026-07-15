// Entry point. Wires up every feature module (each import below runs that
// module's event-listener registration as a side effect) and kicks off
// the initial login-state check.

import './view.js';
import './calendar.js';
import './entryDetail.js';
import './modal.js';
import { bootstrapSession } from './auth.js';

if (window.lucide) lucide.createIcons();

bootstrapSession();
