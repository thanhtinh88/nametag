using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Nametag.Domain.Entities;

namespace Nametag.Infrastructure.Persistence.Configurations;

public class SuspectBankAccountConfiguration : IEntityTypeConfiguration<SuspectBankAccount>
{
    public void Configure(EntityTypeBuilder<SuspectBankAccount> builder)
    {
        builder.ToTable("suspect_bank_accounts");

        builder.HasKey(b => b.Id);

        builder.Property(b => b.BankName)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(b => b.AccountNumber)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(b => b.AccountHolder)
            .HasMaxLength(255);

        builder.Property(b => b.AccountType)
            .IsRequired()
            .HasMaxLength(50)
            .HasDefaultValue("OWNER");

        builder.Property(b => b.IsPrimary)
            .HasDefaultValue(false);

        builder.Property(b => b.Notes)
            .HasColumnType("text");

        builder.HasIndex(b => b.PersonId);
        builder.HasIndex(b => b.AccountNumber);
        builder.HasIndex(b => new { b.PersonId, b.DeletedAt });

        builder.HasOne(b => b.Person)
            .WithMany(p => p.BankAccounts)
            .HasForeignKey(b => b.PersonId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

