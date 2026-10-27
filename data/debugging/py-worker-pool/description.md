# Async worker pool

An image service resizes a batch of images concurrently, with a limit on how many run at once, and tracks how many jobs completed.

## Files
- `models/job.py`: a `Job` (id + how long it takes)
- `services/pool.py`: `run_all(jobs, worker, concurrency, stats)`
- `services/resize.py`: the batch entry point used by the app
- `utils/stats.py`: `Stats`, counts completed jobs

## Expected behavior
- At most `concurrency` jobs run at the same time.
- `run_all` returns results in the **same order as `jobs`**, no matter which job finishes first.
- After a batch, `stats.completed` equals the number of jobs that succeeded.

## Bug report
> Thumbnails are shown next to the wrong products, and the dashboard says 4 images were resized when 8 actually were.

There are **2 bugs**, in different files.
