using Los.Domain.Interfaces;
using Microsoft.EntityFrameworkCore;

namespace Los.Infrastructure.Persistence.Repositories;

/// <summary>Generic EF Core repository implementation.</summary>
public class Repository<T>(LosDbContext db) : IRepository<T> where T : class
{
    protected readonly LosDbContext Db = db;
    protected readonly DbSet<T> Set = db.Set<T>();

    public virtual async Task<T?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        await Set.FindAsync([id], ct);

    public async Task<IReadOnlyList<T>> GetAllAsync(CancellationToken ct = default) =>
        await Set.ToListAsync(ct);

    public async Task AddAsync(T entity, CancellationToken ct = default) =>
        await Set.AddAsync(entity, ct);

    public void Update(T entity) => Set.Update(entity);

    public void Remove(T entity) => Set.Remove(entity);

    public Task<int> SaveChangesAsync(CancellationToken ct = default) =>
        Db.SaveChangesAsync(ct);
}
