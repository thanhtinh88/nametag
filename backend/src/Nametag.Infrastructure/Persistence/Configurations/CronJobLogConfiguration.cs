using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class CronJobLogConfiguration : IEntityTypeConfiguration<CronJobLog>
{
    public void Configure(EntityTypeBuilder<CronJobLog> builder)
    {
        builder.ToTable("cron_job_logs");

        builder.HasKey(c => c.Id);

        builder.Property(c => c.JobName)
            .IsRequired()
            .HasMaxLength(128);

        builder.Property(c => c.Status)
            .IsRequired()
            .HasMaxLength(64);

        builder.Property(c => c.Message)
            .HasMaxLength(4096);

        builder.HasIndex(c => new { c.JobName, c.ExecutedAt });
    }
}
