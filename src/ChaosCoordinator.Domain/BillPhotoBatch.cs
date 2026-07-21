namespace ChaosCoordinator.Domain;

/// <summary>One "scan a bill" submission — all images in a batch are photos/pages of the *same*
/// single bill (unlike EventImportBatch, which can spawn several events from one submission).
/// Images are stored as soon as they're uploaded (see BillPhotoImportController.Extract),
/// independent of whether the user goes on to confirm a match, so the source is never lost.
/// BillId stays null until the user confirms which Bill (existing, newly generated from a
/// template, or a brand-new one-off) the batch belongs to.</summary>
public class BillPhotoBatch
{
    public Guid Id { get; set; }
    public Guid HouseholdId { get; set; }

    public Guid CreatedByUserId { get; set; }
    public User? CreatedByUser { get; set; }

    public DateTime CreatedAt { get; set; }

    public Guid? BillId { get; set; }
    public Bill? Bill { get; set; }

    public ICollection<BillPhotoImage> Images { get; set; } = new List<BillPhotoImage>();
}

/// <summary>One uploaded source image belonging to a BillPhotoBatch.</summary>
public class BillPhotoImage
{
    public Guid Id { get; set; }
    public Guid BatchId { get; set; }
    public BillPhotoBatch? Batch { get; set; }

    public string ImageUrl { get; set; } = "";
    public int Order { get; set; }
}
