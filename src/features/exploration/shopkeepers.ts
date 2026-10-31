import type {WeaponTier} from './weapon-catalog'
type Lines=readonly [string,string,string]
type Profile={id:string;roomId:string;kind:'equipment'|'magic';name:string;title:string;shopName:string;tier:WeaponTier;sellsArmor:boolean;portrait:string;background:string;personality:string;greetings:Lines;purchases:Lines;farewells:Lines}
export const shopkeepers=[
 {id:'hasan',roomId:'merchant-hasan',kind:'equipment',name:'하산',title:'왕릉의 대장장이',shopName:'하산의 대장간',tier:'starter',sellsArmor:false,portrait:'/exploration/shopkeepers/hasan-smith.png',background:'/exploration/shopkeepers/hasan-open-forge.png',personality:'말수 적고 품질에 엄격한 장인',
 greetings:['왔나. 기본에 충실한 무기들이다. 직접 봐라.','겉모양 말고 이음새를 봐. 오래 버틸 물건이다.','손에 맞는 무기부터 골라라. 준비는 여기서 끝내고 가.'],
 purchases:['좋은 물건 골랐다. 함부로 다루지는 마라.','날은 세웠고 이음새도 잡았다. 믿고 써라.','값은 받았다. 품질은 내가 책임진다.'],
 farewells:['살아서 돌아와. 망가진 장비는 고쳐 주마.','무리하지 마라. 쇠도 계속 두드리면 부러진다.','가 봐. 다음에 오면 장비 상태부터 보여 줘.']},
 {id:'karim',roomId:'merchant-karim',kind:'equipment',name:'카림',title:'떠돌이 행상',shopName:'카림의 행상',tier:'advanced',sellsArmor:true,portrait:'/exploration/npcs/kasim-return-merchant-masked.png',background:'/exploration/shopkeepers/karim-open-hall.png',personality:'살갑고 실용적인 행상',
 greetings:['어이, 반갑네! 주머니는 가볍게, 무기는 든든하게 챙겨 가게.','돌아오는 길에도 웃어야지. 손에 맞는 무기부터 골라 보겠나?','허허, 손님이 왔군! 화려하진 않아도 쓸 만한 물건은 있다네.'],
 purchases:['잘 골랐네! 손에 익으면 그게 자네 명검이지.','고맙네, 친구. 그 무기가 돌아오는 길까지 함께하길 바라네.','물건 보는 눈이 있군! 다음에도 좋은 것 챙겨 놓겠네.'],
 farewells:['발밑 조심하게! 무기보다 자네 몸이 더 귀하다네.','무사히 돌아오면 이야기 한 자락 들려주게나.','그래, 다녀오게! 다음에도 웃는 얼굴로 만나세.']},
 {id:'zahir',roomId:'merchant-zahir',kind:'equipment',name:'자히르',title:'황금 보물의 정령',shopName:'자히르의 비밀 진열실',tier:'ultimate',sellsArmor:true,portrait:'/exploration/shopkeepers/zahir-collector.png',background:'/exploration/shopkeepers/zahir-open-vault.png',personality:'정중하고 안목을 중시하는 가면의 정령',
 greetings:['어서 오십시오. 이 방의 물건들은 주인을 신중히 고릅니다.','제 가면보다 진열대에 눈길을 주십시오. 귀한 물건들이 기다립니다.','황금보다 오래 남는 것은 좋은 선택이지요. 천천히 살펴보십시오.'],
 purchases:['훌륭한 안목이십니다. 그 물건의 다음 이야기가 기대되는군요.','오래 기다린 보물이 마침내 주인을 만났습니다.','거래가 성립되었군요. 그 가치가 여정에서 드러나길 바랍니다.'],
 farewells:['다음 만남에도 새로운 보물을 준비해 두겠습니다.','당신의 숨결이 이 왕릉보다 오래 따뜻하기를 바랍니다.','좋은 선택이 좋은 귀환으로 이어지길 바랍니다.']},
 {id:'nadim',roomId:'magic-nadim',kind:'magic',name:'나딤',title:'모래의 견습술사',shopName:'나딤의 작은 주문집',tier:'starter',sellsArmor:false,portrait:'/exploration/shopkeepers/nadim-apprentice.png',background:'/exploration/shopkeepers/nadim-open-camp.png',personality:'호기심 많고 조금 서툰 견습생',
 greetings:['앗, 손님! 오늘 주문들은 제가 직접 확인했어요. 정말이에요!','어서 와요! 복잡하진 않아도 쓸모 있는 마법들이에요.','마법 배우러 오셨죠? 저도 설명 연습 많이 했어요!'],
 purchases:['됐어요! 처음 시전할 땐 천천히, 제가 배운 대로요.','제 첫 제자 같은 기분인데요? 아, 벌써 제자는 아니지만요!','좋은 선택이에요! 저도 그 주문 자주 연습해요.'],
 farewells:['다녀오세요! 다음엔 더 능숙하게 설명해 드릴게요.','마나 아껴 쓰세요! 저는 그걸 자꾸 잊거든요.','돌아오면 어떻게 쓰셨는지 꼭 들려주세요!']},
 {id:'sahira',roomId:'magic-sahira',kind:'magic',name:'사히라',title:'청금석 수정 주술사',shopName:'사히라의 수정 제단',tier:'advanced',sellsArmor:false,portrait:'/exploration/shopkeepers/sahira-shaman.png',background:'/exploration/shopkeepers/sahira-open-sanctum.png',personality:'고요하고 실전을 중시하는 수정의 존재',
 greetings:['숨을 고르세요. 좋은 주문은 차분한 손에서 시작됩니다.','제 몸의 빛보다 당신 안의 마력을 살펴보세요.','수정이 맑게 울리는군요. 오늘은 배움을 나누기 좋은 날입니다.'],
 purchases:['서두르지 않고 익히세요. 정확한 한 번이 중요합니다.','그 힘을 아껴 두었다가 필요한 순간에 펼치세요.','당신의 마력이 새로운 결을 얻었습니다. 잘 다듬어 가세요.'],
 farewells:['호흡을 잃지 마세요. 어둠 속에서도 길은 있습니다.','배운 힘보다 자신의 판단을 먼저 믿으세요.','수정은 기다림에 익숙합니다. 무사히 돌아오세요.']},
 {id:'nefera',roomId:'magic-nefera',kind:'magic',name:'네페라',title:'별의 기록자',shopName:'네페라의 별빛 서고',tier:'ultimate',sellsArmor:false,portrait:'/exploration/shopkeepers/nefera-archivist.png',background:'/exploration/shopkeepers/nefera-open-observatory.png',personality:'절제된 언어로 말하는 별빛과 석판의 기록자',
 greetings:['별의 기록은 준비된 이에게만 열립니다. 당신은 무엇을 찾으십니까?','긴 어둠을 지나오셨군요. 오래된 주문들이 당신을 기다립니다.','이곳에서는 힘의 크기보다 그것을 쓸 뜻을 묻습니다.'],
 purchases:['한 줄의 기록이 당신의 것이 되었습니다. 신중히 펼치십시오.','별은 선택을 기억합니다. 그 힘에 어울리는 길을 걸으십시오.','오래 잠들었던 주문이 새 주인을 만났군요.'],
 farewells:['당신의 다음 발걸음도 기록되기를 바랍니다.','별빛이 닿지 않는 곳에서도 뜻을 잃지 마십시오.','이야기는 아직 끝나지 않았습니다. 무사히 돌아오십시오.']},
] as const satisfies readonly Profile[]
export type ShopkeeperId=typeof shopkeepers[number]['id']
export type ShopkeeperProfile=typeof shopkeepers[number]
export const shopTierLabels:Record<WeaponTier,string>={starter:'일반',advanced:'중급',ultimate:'고급'}
export function getShopkeeper(id:ShopkeeperId='hasan'){return shopkeepers.find(profile=>profile.id===id)!}
export function shopkeeperForRoom(room:string){return shopkeepers.find(profile=>profile.roomId===room)??(room==='merchant'?getShopkeeper('hasan'):room==='magic'?getShopkeeper('nadim'):undefined)}
