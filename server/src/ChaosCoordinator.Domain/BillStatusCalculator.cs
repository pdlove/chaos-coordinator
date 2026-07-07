namespace ChaosCoordinator.Domain;

public static class BillStatusCalculator
{
    private const int DueSoonWindowDays = 7;

    public static BillStatus Compute(DateOnly dueDate, DateOnly? paidDate, DateOnly today)
    {
        if (paidDate is not null) return BillStatus.Paid;
        if (dueDate < today) return BillStatus.Overdue;
        if (dueDate <= today.AddDays(DueSoonWindowDays)) return BillStatus.DueSoon;
        return BillStatus.Upcoming;
    }
}
