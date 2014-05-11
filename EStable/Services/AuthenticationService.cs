using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.Constants;

namespace EStable.Services
{
    public class AuthenticationService
    {
        public bool IsAuthenticated(HttpCookie loginCookie)
        {
            var strDateTime = loginCookie[Codes.Cookies.Login.LastVisit];
            var dateTime = DateTime.Parse(strDateTime);

            return dateTime > DateTime.Now.AddHours(-1);
        }
    }
}