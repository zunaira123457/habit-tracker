# Grade book averages

A teacher's grade book turns each student's scores into an average and a letter grade.

## Files
- `models/student.py`: a `Student` with a name and a list of scores
- `services/report.py`: builds the class report and picks letter grades
- `utils/stats.py`: shared math helpers

## Expected behavior
- The average is the mean of **all** of a student's scores, rounded to one decimal place in the report. No scores means an average of `0.0`.
- Letter grades: 90+ A, 80+ B, 70+ C, 60+ D, otherwise F.
- `class_report` returns `(name, average, letter)` for each student, in input order.

## Bug report
> A student with 90, 80 and 70 got an F on the report. Every student's grade looks too low.

There is **1 bug**.
