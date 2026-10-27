# Download queue

A media app downloads files with at most `n` downloads running at once.

## Files
- `services/queue.js`: `TaskQueue(concurrency)`. `push(task)` returns a promise for the task's result
- `utils/map-limit.js`: `mapLimit(items, limit, fn)`, which maps over items with the queue
- `models/download.js`: describes a download (url + simulated duration)
- `services/downloader.js`: downloads a list of files

## Expected behavior
- No more than `concurrency` tasks are ever **running** (started and not yet finished) at the same time.
- As tasks finish, waiting tasks start, in the order they were pushed.
- `push` resolves or rejects with the task's own result or error.
- `mapLimit` resolves to results in the **same order as `items`**.

## Bug report
> With a limit of 2, our CDN logs show all 20 downloads starting at the same instant and we get rate-limited. Files also get saved under each other's names.

There are **2 bugs**, in different files.
