# Event batches

A pipeline removes duplicate events and sends the rest to a server in batches.

## Files
- `models/event.py`: an `Event` with a numeric id and a kind
- `services/dedupe.py`: removes duplicate ids
- `services/batch.py`: plans the batches to send
- `utils/chunks.py`: splits a list into chunks

## Expected behavior
- Duplicates are removed, **keeping the order** in which each id first appeared.
- `chunk(items, size)` splits a list into consecutive lists of at most `size`. No items are lost, and the last chunk may be shorter.
- `plan_batches(events, size)` = dedupe, then chunk.

## Bug report
> Events arrive at the server out of order, and the newest events never arrive at all. Sometimes a whole batch is missing.

There are **2 bugs**.
