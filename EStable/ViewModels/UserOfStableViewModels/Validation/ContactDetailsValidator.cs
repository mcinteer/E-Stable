using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Web;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepOne;
using FluentValidation;

namespace EStable.ViewModels.UserOfStableViewModels.Validation
{
    public class ContactDetailsValidator : AbstractValidator<ContactDetailsViewModel>
    {
        public ContactDetailsValidator()
        {
            RuleFor(x => x.StableName)
                .Length(1,50)
                .NotEmpty()
                .WithMessage(ValidationMessages.StableName_IncorrectLength);
            RuleFor(x => x.StableType)
                .NotEmpty()
                .WithMessage(ValidationMessages.StableType_Invalid);
            RuleFor(x => x.Trainer)
                .Length(1, 50)
                .NotEmpty()
                .WithMessage(ValidationMessages.TrainerName_IncorrectLength);
            RuleFor(x => x.LegalEntity)
                .Length(1, 50)
                .NotEmpty()
                .WithMessage(ValidationMessages.LegalEntity_IncorrectLength);
            RuleFor(x => x.Mobile)
                .Must(ContainUpToTwentyDigits)
                .WithMessage(ValidationMessages.Mobile_InvalidNumber);
            RuleFor(x => x.Fax)
                .Must(ContainUpToTwentyDigits)
                .Length(1, 20)
                .When(it => false == string.IsNullOrEmpty(it.Fax))
                .WithMessage(ValidationMessages.Fax_InvalidNumber);
            RuleFor(x => x.Phone)
                .Must(ContainUpToTwentyDigits)
                .Length(1,20)
                .When(it => false == string.IsNullOrEmpty(it.Phone))
                .WithMessage(ValidationMessages.Phone_InvalidNumber);
        }

        
        private static bool ContainUpToTwentyDigits(string arg)
        {
            arg = arg ?? "";
            var regex = new Regex(@"\d{1,20}");
            return regex.IsMatch(arg);
        }
    }
}