using FluentValidation;
using Microsoft.Extensions.DependencyInjection;
using Nametag.Application.Services;

namespace Nametag.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddValidatorsFromAssembly(typeof(DependencyInjection).Assembly);
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IUserService, UserService>();
        services.AddScoped<IPersonService, PersonService>();
        services.AddScoped<IGroupService, GroupService>();
        services.AddScoped<IRelationshipService, RelationshipService>();
        services.AddScoped<IEventService, EventService>();
        services.AddScoped<IJournalService, JournalService>();

        return services;
    }
}
