# Probe 11 gameplay and input latency investigation

## Device evidence (2026-09-11)
User reports the newly installed version progresses into gameplay but responds late after button presses. On clarification, they selected delayed button response rather than a slow-moving shot gauge. Screenshots show character selection, the tutorial, the character/shot gauge on the course, and an overhead hole view. They also show magenta icon backgrounds and broken text/numeric fields. This is evidence of course/tutorial entry, not proof of a completed round or reliable saves.

Probe 11 only adds fault diagnostics; successful play on this attempt does not establish that the earlier empty resource lookup is fixed. No new selection/index error snapshot was supplied.

## Source trace
Pinned WIE: 1ed8710956e727629e67db762ddc1e6bd6151a1f.

1. wie-web/src/ts/app.ts registers pointerdown and immediately calls wieWeb.key_down. It uses pointer capture and handles pointerup/pointercancel. No click handler, release-only activation, or explicit touch debounce delays keydown.
2. wie-web/src/rust/lib.rs key_down directly submits Event::Keydown. update submits redraw and repeat events and synchronously calls emulator.tick. App updates are scheduled with requestAnimationFrame.
3. Web platform is explicitly single-threaded. Thus a long synchronous update can delay delivery of the browser pointer handler. This is a candidate, not a measurement of this device.
4. wie-backend/src/system/event_queue.rs stores all events in one FIFO VecDeque. No explicit key priority or queue length bound exists. This does not prove a backlog occurs.
5. wie-midp/src/classes/net/wie/event_queue.rs invokes due timer callbacks inline before continuing to later queued events. When empty it sleeps 16 ms. A slow callback can postpone later key delivery; 16 ms polling alone is not sufficient evidence for the reported large delay.
6. wie-backend/src/executor.rs uses an 8 ms tick budget, checked between step calls. A step polls every runnable task; the budget does not preempt an individual poll. Reducing the constant alone cannot guarantee low input latency.

## Next measurement, before changing ordering
Measure browser event timestamp-to-handler delay, synchronous update duration, and guest enqueue-to-dispatch delay separately. Compare the same tutorial input on the same device. This separates browser/main-thread occupancy from guest event processing. Do not claim the raw pointer event timestamp measures final on-screen response.

No arbitrary key prioritization, timer dropping, extra ticks in pointerdown, or sleep reduction has been applied: these would change guest timing/order before establishing the bottleneck. No performance improvement, new APK, or device timing result is claimed by this investigation.
